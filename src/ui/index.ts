import { AccountRecord, WalletApi } from "@mepecbe/budgetbakers-wallet-api";
import * as blessed from "blessed";
import { Entry } from '@napi-rs/keyring'
import { PasswordStorage } from "../password-storage/password-storage";
import * as contrib from "blessed-contrib";

export class UiController {
	private screen: blessed.Widgets.Screen;
	private passwordManager: PasswordStorage;

	private mainBox: blessed.Widgets.BoxElement;

	private enterApiTokenFormInputBox: blessed.Widgets.InputElement;
	private enterApiTokenFormInputBoxAcceptButton: blessed.Widgets.ButtonElement;
	private enterApiTokenFormInputBoxCancelButton: blessed.Widgets.ButtonElement;

	private operationsTable: contrib.Widgets.TableElement;
	private walletApiClient!: WalletApi;

	private selectedAccount = 0;
	private accounts: AccountRecord[] = [];
	private accountsButtonElements: blessed.Widgets.ButtonElement[] = [];
	private async renderAccountsMenu(): Promise<void> {
		if (this.accounts.length != this.accountsButtonElements.length) {
			let leftOffset = 1;

			for (let accountIndex = 0; accountIndex < this.accounts.length; accountIndex++) {
				const account = this.accounts[accountIndex];

				const button = blessed.button({
					parent:
						this.mainBox,
					top: 1,
					clickable: true,
					mouse: true,
					keyable: true,
					left: leftOffset,
					width: account.name.length + 10,
					height: 3,
					content: account.name,
					tags: true,
					align: 'left',
					style: {
						fg: 'white',
						bg: accountIndex == 0 ? "green" : 'blue',
						focus: {
							fg: 'white',
							bg: 'red'
						},
						hover: {
							fg: 'white',
							bg: 'green'
						}
					},
					border: {
						type: 'line',
						fg: 14 // cyan
					},
				});

				button.on("press", () => {
					this.switchSelectedAccountIndex(accountIndex);
				});

				this.accountsButtonElements.push(
					button
				);

				leftOffset += Number(button.width) + 1;
			}
		} else {
			for (let accountIndex = 0; accountIndex < this.accounts.length; accountIndex++) {
				const account = this.accounts[accountIndex];
				const button = this.accountsButtonElements[accountIndex];

				button.style.bg = this.selectedAccount == accountIndex ? "green" : 'blue'
			}
		}
	}

	/**
	 * ! ADD LOAD FROM CACHE
	 */
	private async renderOperationsList(): Promise<void> {
		const currentSelectedAccount = this.accounts[this.selectedAccount];
		const data: [string, string, string, string, string][] = [];

		for (
			const recordData
			of
			(await this.walletApiClient.records.getRecords({ accountId: currentSelectedAccount.id })).records
		) {
			const opDate = new Date(recordData.recordDate);

			data.push([
				`${opDate.getFullYear()}-${formatNumber(opDate.getMonth())}-${formatNumber(opDate.getDate())} ${formatNumber(opDate.getHours())}:${formatNumber(opDate.getMinutes())}`,
				recordData.accountName ?? `UNKNOWN`,
				`${recordData.amount.value} ${recordData.amount.currencyCode}`,
				recordData.category ? recordData.category.name : ``,
				recordData.note ?? ""
			]);
		}

		this.operationsTable.focus();
		this.operationsTable.setData(
			{
				headers:
					['Op date', 'Account', 'Amount', 'Category', "Description"],
				data:
					data
			}
		);
	}

	private async switchSelectedAccountIndex(to: number): Promise<void> {
		if (to < 0){ return; }
		if (to >= this.accounts.length) { return; }

		this.selectedAccount = to;
		await this.renderAccountsMenu();
		await this.renderOperationsList();
		this.screen.render();
	}

	public async init(): Promise<void> {
		const walletApiToken = await this.passwordManager.getWalletToken();

		if (!walletApiToken) {
			this.enterApiTokenFormInputBox.focus();
			return;
		}

		this.walletApiClient = new WalletApi(walletApiToken);

		try {
			const accountsData = await this.walletApiClient.accounts.getAccounts();

			this.accounts = accountsData.accounts;
		} catch (error) {
			this.enterApiTokenFormInputBox.setLabel(`Invalid API token, please enter new token`);
			this.enterApiTokenFormInputBox.focus();
			return;
		}

		this.operationsTable.focus();
		this.operationsTable.setData(
			{
				headers:
					['Op date', 'Account', 'amount', "description"],
				data:
					[]
			}
		);

		await this.renderAccountsMenu();
		await this.renderOperationsList();
		this.enterApiTokenFormInputBox.hide();
		this.operationsTable.show();
	}

	public async run(): Promise<void> {
		this.screen.render();
	}

	constructor() {
		this.passwordManager = new PasswordStorage();

		this.screen = blessed.screen({
			smartCSR: true,
			title: `Wallet by budgetbakers`,
			fullUnicode: true,
			dockBorders: true
		});

		this.mainBox = blessed.box({
			hidden: false,
			parent: this.screen,
			//top: 'center',
			//left: 'center',
			width: '100%',
			height: '100%',
			border: {
				type: 'line',
			},
			content: 'Wallet by budgetbakers client',
			tags: true,
			style: {
				fg: 'white',
				border: {
					fg: 'cyan',
				},
			},
		});

		this.enterApiTokenFormInputBox = blessed.textbox({
			name: "api_token",
			hidden: false,
			input: true,
			keys: true,
			inputOnFocus: true,
			screen: this.screen,
			parent: this.mainBox,
			label: `Enter API token`,
			top: 'center',
			left: 'center',
			width: "30%",
			height: "30%",
			border: {
				type: 'line',
			},
			style: {
				fg: 'white',
				bg: 'black',
				focus: {
					bg: 'red',
					fg: 'white'
				}
			}
		});

		this.enterApiTokenFormInputBoxCancelButton = blessed.button({
			parent: this.enterApiTokenFormInputBox,
			mouse: true,
			keys: true,
			shrink: true,
			left: "center",
			top: Number(this.enterApiTokenFormInputBox.atop) + Number(this.enterApiTokenFormInputBox.height) - 1,
			padding: {
				left: 1,
				right: 1
			},
			name: 'cancel',
			content: 'Cancel',
			style: {
				bg: 'blue',
				focus: {
					bg: 'red'
				},
				hover: {
					bg: 'red'
				}
			}
		});

		this.enterApiTokenFormInputBoxAcceptButton = blessed.button({
			parent: this.enterApiTokenFormInputBox,
			mouse: true,
			keys: true,
			shrink: true,
			left: Number(this.enterApiTokenFormInputBoxCancelButton.width) + this.enterApiTokenFormInputBoxCancelButton.content.length + 2,
			top: Number(this.enterApiTokenFormInputBox.atop) + Number(this.enterApiTokenFormInputBox.height) - 1,
			padding: {
				left: 1,
				right: 1
			},

			name: 'accept_api_token',
			content: 'Accept',
			style: {
				bg: 'blue',
				focus: {
					bg: 'red'
				},
				hover: {
					bg: 'red'
				}
			}
		});

		this.operationsTable = contrib.table({
			parent: this.mainBox
			, hidden: true
			, keys: true
			, fg: 'white'
			, selectedFg: 'white'
			, selectedBg: 'blue'
			//, interactive: true
			, label: 'Account operations'
			, width: '90%'
			, height: "90%",

			bottom: 1

			//, height: 50
			, border: { type: "line", fg: "cyan" }
			, columnSpacing: 3
			, columnWidth: [16, 32, 16, 32, 64]
			//, top: 10
		});

		blessed.text({
			parent:
				this.mainBox,
			label:
				`q/e - switch account  ↑,↓ - navigate  + add operation  m - more info`,
			bottom:
				"0"
		});

		this.operationsTable.on(
			"select",
			() => {
				process.exit();
			}
		);

		this.enterApiTokenFormInputBoxCancelButton.on('press',
			() => {
				process.exit();
			}
		);

		this.enterApiTokenFormInputBoxAcceptButton.on("press",
			async () => {
				this.walletApiClient = new WalletApi(this.enterApiTokenFormInputBox.content);

				try {
					await this.walletApiClient.accounts.getAccounts();
				} catch {
					return;
				}

				this.passwordManager.setWalletToken(this.enterApiTokenFormInputBox.content);
				this.enterApiTokenFormInputBox.hide();
				this.mainBox.show();
				this.enterApiTokenFormInputBoxAcceptButton.hide();
				this.enterApiTokenFormInputBoxCancelButton.hide();
			}
		);

		// Switch account(to left)
		this.screen.key(['q', 'й'], () => {
			this.switchSelectedAccountIndex(this.selectedAccount - 1);
		});

		// Switch account(to right)
		this.screen.key(['e', 'у'], () => {
			this.switchSelectedAccountIndex(this.selectedAccount + 1);
		});
		
		// Show more info
		this.screen.key(['m', 'ь'], () => {
			const selectedId = (this.operationsTable as any).rows.selected;
			this.screen.destroy();
			console.log(`SELECTED opertion ${selectedId}`);
			console.log(this.operationsTable);
		});

		this.screen.key('up', () => {
			/*selectedIdx = (selectedIdx - 1 + items.length) % items.length;
			renderMenu();*/
			//process.exit();
		});

		this.screen.key('down', () => {
			/*selectedIdx = (selectedIdx + 1) % items.length;
			renderMenu();*/
		});


		this.screen.key(['escape', 'C-c'], () => {
			this.screen.destroy();
			process.exit(0);
		});

		this.screen.on('resize', () => {
			this.screen.render();
		});
	}
}

function formatNumber(
	digit: number
): string {
	return digit < 10 ? `0${digit}` : digit.toString()
}