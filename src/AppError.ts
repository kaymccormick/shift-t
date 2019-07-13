export default class AppError extends Error {
    public constructor(message: string, public readonly id: string=message) {
        super(message);
    }
}
