module.exports = {
    setupFilesAfterEnv: ['./jest.setup.js'],
    // Jest's default transform skips .mjs. Browser modules that main/ui/server.js also imports
    // (questionTypes.mjs and its helpers) must be .mjs to load on Node 18, so transform them too.
    transform: {
        '^.+\\.m?[jt]sx?$': 'babel-jest'
    }
}
