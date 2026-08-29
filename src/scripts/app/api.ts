import { authorizationHeader } from '../auth';

export async function fetchAppData<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: {
      Authorization: await authorizationHeader(),
    },
  });

  if (response.status === 401) {
    window.location.assign('/entrar');
    throw new Error('Sessão inválida.');
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar estes dados agora.');
  }

  return response.json() as Promise<T>;
}
