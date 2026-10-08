import { authorizationHeader } from '../auth';

export async function fetchAppData<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: {
      Authorization: await authorizationHeader(),
    },
  });

  if (response.status === 401) {
    // A rejected API request does not clear Firebase's persisted session.
    // Redirecting to login here would immediately bounce back to the app.
    // Let the data view display its error state; protectPage handles sign-in.
    throw new Error('Sessão inválida.');
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar estes dados agora.');
  }

  return response.json() as Promise<T>;
}
