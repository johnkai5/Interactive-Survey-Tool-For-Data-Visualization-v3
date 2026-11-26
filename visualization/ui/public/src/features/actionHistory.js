// Undo/Redo history management
// Citation: 
// References: Base on the answer by Menelaos Kotsollaris
// https://stackoverflow.com/questions/11530276/how-do-i-implement-a-simple-undo-redo-for-actions-in-java
// Refrences: https://www.dofactory.com/net/command-design-pattern

// Uses the Command and Memento patterns
// to manage the history of user actions.

// Copy the answer to prevent subsequent modifications 
// from affecting the saved snapshot
function copy(state) {
    return JSON.parse(JSON.stringify(state))
}

export class Memento {
    constructor(state) {
        this.state = copy(state)
    }

    getState() {
        return copy(this.state)
    }
}

export class SnapshotCommand {
    constructor(receiver, before, after) {
        this.receiver = receiver
        this.before = new Memento(before)
        this.after = new Memento(after)
    }

    execute() {
        this.receiver.restore(this.after.getState())
    }

    undo() {
        this.receiver.restore(this.before.getState())
    }
}

export class ActionHistory {
    constructor() {
        this.commands = []
        this.position = 0

        this.onChange = () => {}
    }

    execute(command) {
        command.execute()
        this.record(command)
    }

    record(command) {

        this.commands.splice(this.position)

        this.commands.push(command)
        this.position++

        this.onChange()
    }

    undo() {
        if (!this.canUndo) return

        const command = this.commands[this.position - 1]
        command.undo()

        this.position--
        this.onChange()
    }

    redo() {
        if (!this.canRedo) return

        const command = this.commands[this.position]
        command.execute()

        this.position++
        this.onChange()
    }

    capture(receiver, action) {
        const before = copy(receiver.read())

        action()

        const after = copy(receiver.read())

        if (JSON.stringify(before) === JSON.stringify(after)) return

        this.record(
            new SnapshotCommand(receiver, before, after)
        )
    }

    get canUndo() {
        return this.position > 0
    }

    get canRedo() {
        return this.position < this.commands.length
    }

    clear() {
        this.commands = []
        this.position = 0
        this.onChange()
    }
}

export const actionHistory = new ActionHistory()