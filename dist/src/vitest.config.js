"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        include: ['__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['**/*.ts'],
            exclude: ['**/*.d.ts', 'node_modules/**', 'dist/**']
        }
    }
});
//# sourceMappingURL=vitest.config.js.map