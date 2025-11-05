export const responseBuilder = (status: number, message: string, data: any) => {
	return { status, message, data };
};
