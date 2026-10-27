export class ConflictoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictoError';
  }
}
