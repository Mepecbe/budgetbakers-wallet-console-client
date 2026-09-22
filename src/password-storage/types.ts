export interface IPasswordStorage {
	getWalletToken(): Promise<string | null>;
	setWalletToken(value: string): Promise<void>;
	deletePassword(): Promise<void>;
}