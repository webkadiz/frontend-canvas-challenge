// @vitest-environment jsdom
import { createRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field, SelectField } from '../src/components/ui';

afterEach(cleanup);

it('preserves the input ID, ref, external description and associates hint and error', () => {
  const ref = createRef<HTMLInputElement>();
  render(
    <>
      <p id="external">External</p>
      <Field
        id="title"
        ref={ref}
        label="Title"
        hint="Limit"
        error="Required"
        aria-describedby="external"
      />
    </>,
  );
  const input = screen.getByRole('textbox', { name: 'Title' });
  expect(ref.current).toBe(input);
  expect(input.id).toBe('title');
  expect(input.getAttribute('aria-describedby')).toBe('external title-hint title-error');
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByRole('alert').id).toBe('title-error');
});

it('does not focus the input when its visible label is clicked', async () => {
  const user = userEvent.setup();
  render(<Field label="Title" />);
  const input = screen.getByRole('textbox', { name: 'Title' });
  await user.click(screen.getByText('Title'));
  expect(document.activeElement).not.toBe(input);
  await user.tab();
  expect(document.activeElement).toBe(input);
});

it('removes obsolete error descriptions while keeping external aria attributes', () => {
  const { rerender } = render(
    <Field id="title" label="Title" error="Required" aria-describedby="external" />,
  );
  rerender(<Field id="title" label="Title" aria-describedby="external" aria-invalid="grammar" />);
  const input = screen.getByRole('textbox', { name: 'Title' });
  expect(input.getAttribute('aria-describedby')).toBe('external');
  expect(input.getAttribute('aria-invalid')).toBe('grammar');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('gives repeated fields distinct generated IDs', () => {
  render(
    <>
      <Field label="Title" />
      <Field label="Title" />
    </>,
  );
  const inputs = screen.getAllByRole('textbox');
  expect(inputs[0].id).not.toBe(inputs[1].id);
  for (const input of inputs)
    expect(document.getElementById(input.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Title',
    );
});

it('supports keyboard selection, refs, hints and disabled state', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const ref = createRef<HTMLSelectElement>();

  const { rerender } = render(
    <SelectField ref={ref} label="Source" hint="Choose a node" defaultValue="a" onChange={onChange}>
      <option value="a">A</option>
      <option value="b">B</option>
    </SelectField>,
  );

  const select = screen.getByRole('combobox', { name: 'Source' });
  expect(ref.current).toBe(select);
  expect(document.getElementById(select.getAttribute('aria-describedby')!)?.textContent).toBe(
    'Choose a node',
  );
  await user.selectOptions(select, 'b');
  expect(onChange).toHaveBeenCalledOnce();
  expect(ref.current?.value).toBe('b');
  rerender(
    <SelectField ref={ref} label="Source" disabled onChange={onChange}>
      <option value="a">A</option>
      <option value="b">B</option>
    </SelectField>,
  );
  await user.selectOptions(select, 'a');
  expect(onChange).toHaveBeenCalledOnce();
});
