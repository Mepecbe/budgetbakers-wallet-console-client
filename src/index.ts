import { UiController } from "./ui";

async function main(): Promise<void> {
	const uiController = new UiController();
	await uiController.init();
	await uiController.run();
}

main();