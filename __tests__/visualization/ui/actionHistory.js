const {
    ActionHistory,
    Memento,
    SnapshotCommand,
} = require('../../../visualization/ui/public/src/features/actionHistory.js')

// A receiver whose whole state is one plain value, standing in for marks,
// selections or regions so the history logic is tested on its own.
function makeReceiver(initial) {
    const receiver = {
        state: initial,
        read() {
            return receiver.state
        },
        restore(state) {
            receiver.state = state
        },
    }
    return receiver
}

describe('Memento', () => {
    test('is not affected by later changes to the saved object', () => {
        const state = { points: [{ x: 1 }] }
        const memento = new Memento(state)

        state.points[0].x = 99

        expect(memento.getState()).toEqual({ points: [{ x: 1 }] })
    })

    test('hands out copies so callers cannot change the snapshot', () => {
        const memento = new Memento({ ids: ['a'] })

        memento.getState().ids.push('b')

        expect(memento.getState()).toEqual({ ids: ['a'] })
    })
})

describe('SnapshotCommand', () => {
    test('execute restores the after state and undo restores the before state', () => {
        const receiver = makeReceiver('start')
        const command = new SnapshotCommand(receiver, 'before', 'after')

        command.execute()
        expect(receiver.state).toBe('after')

        command.undo()
        expect(receiver.state).toBe('before')
    })
})

describe('ActionHistory', () => {
    let history, receiver

    beforeEach(() => {
        history = new ActionHistory()
        receiver = makeReceiver([])
    })

    function add(value) {
        history.capture(receiver, () => {
            receiver.state = [...receiver.state, value]
        })
    }

    test('starts with nothing to undo or redo', () => {
        expect(history.canUndo).toBe(false)
        expect(history.canRedo).toBe(false)
    })

    test('capture records an action that can be undone and redone', () => {
        add('a')
        add('b')
        expect(receiver.state).toEqual(['a', 'b'])

        history.undo()
        expect(receiver.state).toEqual(['a'])
        expect(history.canRedo).toBe(true)

        history.undo()
        expect(receiver.state).toEqual([])
        expect(history.canUndo).toBe(false)

        history.redo()
        history.redo()
        expect(receiver.state).toEqual(['a', 'b'])
        expect(history.canRedo).toBe(false)
    })

    test('capture ignores actions that do not change the state', () => {
        history.capture(receiver, () => {})

        expect(history.canUndo).toBe(false)
        expect(history.commands).toHaveLength(0)
    })

    test('a new action after an undo discards the redo branch', () => {
        add('a')
        add('b')
        history.undo()

        add('c')

        expect(receiver.state).toEqual(['a', 'c'])
        expect(history.canRedo).toBe(false)

        history.undo()
        expect(receiver.state).toEqual(['a'])
    })

    test('undo and redo do nothing at the ends of the history', () => {
        const onChange = jest.fn()
        history.onChange = onChange

        history.undo()
        history.redo()
        expect(onChange).not.toHaveBeenCalled()

        add('a')
        history.redo()
        expect(receiver.state).toEqual(['a'])
        expect(onChange).toHaveBeenCalledTimes(1)
    })

    test('execute runs the command and records it', () => {
        history.execute(new SnapshotCommand(receiver, [], ['x']))

        expect(receiver.state).toEqual(['x'])

        history.undo()
        expect(receiver.state).toEqual([])
    })

    test('onChange fires on every record, undo, redo and clear', () => {
        const onChange = jest.fn()
        history.onChange = onChange

        add('a')
        history.undo()
        history.redo()
        history.clear()

        expect(onChange).toHaveBeenCalledTimes(4)
    })

    test('clear empties the history', () => {
        add('a')
        add('b')
        history.undo()

        history.clear()

        expect(history.canUndo).toBe(false)
        expect(history.canRedo).toBe(false)
        expect(receiver.state).toEqual(['a'])
    })
})
