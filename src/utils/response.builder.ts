export function responseBuilder(
  status: number,
  message: string,
  data?: any,
  authStatus?: any
) {
  const response: any = {
    status,
    message,
    timestamp: new Date().toISOString(),
  };

  if (data) {
    response.data = data;
  }

  if (authStatus) {
    response.authStatus = authStatus;
  }

  return response;
}
