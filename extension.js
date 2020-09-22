const vscode = require('vscode');
const cp = require('child_process');
const fs = require('fs')
const path = require('path');

let status = null;

function getLandoConfigPath(from) {
	const landoFileName = '.lando.yml';
	const searchPath = path.join(from, landoFileName);
	let found = false;

	if (from == '/') {
		return false;
	}

	try {
	    if (fs.existsSync(searchPath)) {
	        found = {
				path: searchPath,
				dir: from,
			};
	    }
	} catch (err) {}

	if (!found) {
		return getLandoConfigPath(path.join(from, '../'))
	}

	return found;
}

/**
 * Get current open file path
 */
function currentPageUri() {
    return vscode.window.activeTextEditor &&
        vscode.window.activeTextEditor.document &&
        vscode.window.activeTextEditor.document.uri;
}

/**
 * Run command
 *
 * @param { string } currentEditor - current open file path
 * @param { string } command - command to execute
 */
function runLandoCommand(currentEditor = false, command = '') {
	if (!currentEditor) {
	    vscode.window.showInformationMessage('Unable to get current file path');
	    return false;
	}

	const fileName = currentEditor.fsPath.split('/').pop();
	const fileDir = currentEditor.fsPath.replace(fileName, '');
	const landoFile = getLandoConfigPath(fileDir);

	if (!landoFile) {
	    vscode.window.showInformationMessage('Unable to get Lando configuration path');
	    return false;
	}

	if (!status) {
	    status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	}
	status.color = '';
	status.text = '';
	status.hide();

	// status.text = `$(vm-running) Executing command ${command}`;
	status.text = `$(sync~spin) Executing command ${command}`;
	status.show();

	command = command.replace('${landopath}', landoFile.path);
	command = command.replace('${landodir}', landoFile.dir);

	cp.exec(`cd ${landoFile.dir} && ${command}`, (err) => {
	    if (err) {
	        console.error(err);
	        status.text = '';
	        status.hide();
	        vscode.window.showInformationMessage('There was an error please view console for more information');
	        return;
	    }
	    status.color = 'rgb(76, 175, 80)';
	    status.text = `$(check) Lando command completed`;
	    setTimeout(() => { status.hide() }, 2000);
	});
}


function activate(context) {
	const commands = {
		start: {
			cmd: 'lando start',
			confirm: false,
		},
		stop: {
		    cmd: 'lando stop',
		    confirm: false,
		},
		rebuild: {
		    cmd: 'lando rebuild -y',
		    confirm: false,
		},
		destroy: {
		    cmd: 'lando destroy -y',
		    confirm: 'Are you sure you want to destroy the app? this process can not be reversed',
		},
		poweroff: {
		    cmd: 'lando poweroff',
		    confirm: false,
		},
		info: {
		    cmd: 'lando info',
		    confirm: false,
		},
		showconfig: {
		    cmd: 'open -R ${landopath}',
		    confirm: false,
		},
	}

	for (const key in commands) {
		if (commands.hasOwnProperty(key)) {
			let item = commands[key];
			let command = item.cmd;
			let confirm = item.confirm;
			let disposable = vscode.commands.registerCommand(`lando-commands.${key}`, () => {
				const filePath = currentPageUri();

				if (!confirm) {
					return runLandoCommand(filePath, command);
				}

				vscode.window.showInformationMessage('Are you sure you want to destroy', {
					title: 'Cancel',
					isCloseAffordance: true
				}, {
				    title: 'Confirm'
				}).then(selection => {
				    if (selection.title == 'Confirm') {
				        return runLandoCommand(filePath, command);
				    }
				});
			});

			context.subscriptions.push(disposable);
		}
	}


	/**
	 * Open lando file in VSCode
	 */
	let disposable = vscode.commands.registerCommand(`lando-commands.openconfig`, () => {
		const filePath = currentPageUri();
		if (!filePath) {
		    vscode.window.showInformationMessage('Unable to get current file path');
		    return false;
		}

		const fileName = filePath.fsPath.split('/').pop();
		const fileDir = filePath.fsPath.replace(fileName, '');
		const landoFile = getLandoConfigPath(fileDir);

		if (!landoFile) {
		    vscode.window.showInformationMessage('Unable to get Lando configuration path');
		    return false;
		}
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(landoFile.path));
	});
	context.subscriptions.push(disposable);
}

exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
