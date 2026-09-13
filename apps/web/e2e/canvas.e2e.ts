import { expect, test, type Page } from '@playwright/test';

async function chain(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Новое пространство', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Новое пространство', exact: true });

  await dialog.getByRole('textbox', { name: 'Название', exact: true }).fill('Браузерная проверка');
  await dialog.getByRole('textbox', { name: 'Название', exact: true }).press('Enter');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Добавить пример цепочки', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Опишите изображение', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Все изменения сохранены', { exact: true })).toBeVisible();
}

test('lost graph PUT is reconciled before generation; result survives reload', async ({ page }) => {
  await chain(page);

  let dropped = false;
  const writes: string[] = [];

  await page.route('**/api/spaces/*/graph', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();

    writes.push('save');

    const response = await route.fetch();

    expect(response.ok()).toBe(true);

    if (!dropped) {
      dropped = true;
      await route.abort('failed');
    } else await route.fulfill({ response });
  });
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/generations'))
      writes.push('generate');
  });

  const prompt = 'Тихий лес в утреннем тумане';

  await page.getByRole('textbox', { name: 'Опишите изображение', exact: true }).fill(prompt);
  await page.getByRole('button', { name: 'Сгенерировать', exact: true }).click();
  await expect(page.getByRole('img', { name: prompt, exact: true })).toBeVisible();
  expect(dropped).toBe(true);
  expect(writes).toEqual(['save', 'generate']);
  await expect(page.getByText('Все изменения сохранены', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Опишите изображение', exact: true })).toHaveValue(
    prompt,
  );
  await expect(page.getByRole('img', { name: prompt, exact: true })).toBeVisible();
});

test('412 preserves local text until explicit server reload and draft recovery', async ({
  page,
}) => {
  await chain(page);

  const input = page.getByRole('textbox', { name: 'Опишите изображение', exact: true });
  const savedText = await input.inputValue();

  await page.route('**/api/spaces/*/graph', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();

    const response = await route.fetch({
      headers: { ...route.request().headers(), 'if-match': '"outdated-version"' },
    });

    expect(response.status()).toBe(412);
    await route.fulfill({ response });
  });
  await input.fill('Мой локальный текст');
  await expect(page.getByText('Конфликт версий', { exact: true })).toBeVisible();
  await expect(input).toHaveValue('Мой локальный текст');
  await page.unroute('**/api/spaces/*/graph');
  await page.getByRole('button', { name: 'Перечитать серверный граф', exact: true }).click();
  await expect(input).toHaveValue(savedText);
  await page.getByRole('button', { name: 'Восстановить черновик', exact: true }).click();
  await expect(input).toHaveValue('Мой локальный текст');
  await expect(page.getByText('Все изменения сохранены', { exact: true })).toBeVisible();
  await page.reload();
  await expect(input).toHaveValue('Мой локальный текст');
});
