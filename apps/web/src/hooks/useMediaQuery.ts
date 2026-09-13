import { useEffect, useState } from 'react';

/** Следит за медиазапросом, в том числе при смене ориентации устройства. */
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);

  useEffect(() => {
    const media = window.matchMedia(query);

    const update = () => setMatches(media.matches);

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
};
