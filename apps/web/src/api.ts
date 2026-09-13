import type { GraphData, GenerationData, GenerationRequest, SpaceData } from '@canvas/contracts';
import { http } from './lib/http';
import { toReply } from './lib/http-response';

const base = import.meta.env.VITE_API_URL ?? '';

/** Дополняет путь изображения базовым адресом API. */
export const imageUrl = (path: string) => `${base}${path}`;

/** Типизированные операции канваса на Axios; ETag и ключи повторов передаются явно. */
export const api = {
  spaces: () => http.get<SpaceData[]>('/api/spaces').then(toReply),
  createSpace: (title: string) => http.post<SpaceData>('/api/spaces', { title }).then(toReply),
  renameSpace: (id: string, title: string) =>
    http.put<SpaceData>(`/api/spaces/${encodeURIComponent(id)}`, { title }).then(toReply),
  graph: (id: string, signal?: AbortSignal) =>
    http.get<GraphData>(`/api/spaces/${id}/graph`, { signal }).then(toReply),
  save: (id: string, graph: GraphData, etag: string) =>
    http
      .put<GraphData>(`/api/spaces/${id}/graph`, graph, { headers: { 'If-Match': etag } })
      .then(toReply),
  generations: (id: string) =>
    http.get<GenerationData[]>(`/api/spaces/${id}/generations`).then(toReply),
  generate: (id: string, body: GenerationRequest, key: string) =>
    http
      .post<GenerationData>(`/api/spaces/${id}/generations`, body, {
        headers: { 'Idempotency-Key': key },
      })
      .then(toReply),
  generation: (space: string, id: string, signal?: AbortSignal) =>
    http.get<GenerationData>(`/api/spaces/${space}/generations/${id}`, { signal }).then(toReply),
};
