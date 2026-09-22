import { IPasswordStorage } from "./types";
import { Entry } from '@napi-rs/keyring';


export class PasswordStorage implements IPasswordStorage {
	private passwordProvider: Entry;

	async getWalletToken(): Promise<string | null> {
		return this.passwordProvider.getPassword();
	}

	async setWalletToken(value: string): Promise<void> {
		this.passwordProvider.setPassword(value);
	}

	async deletePassword(): Promise<void> {
		this.passwordProvider.deletePassword();
	}
	
	constructor(
		service = "wallet_console_client",
		username = "wallet_client"
	){
		this.passwordProvider = new Entry(service, username);
	}
}