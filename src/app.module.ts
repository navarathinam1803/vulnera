import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SecurityAssistantModule } from './modules/security-assistant/security-assistant.module.js';

/**
 * Root Application Module
 *
 * RiskLens: MCP developer security assistant + pizza shop finder.
 * Security assistant scans dependencies, answers questions, prioritizes fixes,
 * and translates technical security output into actionable guidance.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'risklens',
        version: '1.0.0',
    },
    logging: {
        level: 'info',
    },
})
@Module({
    name: 'app',
    description: 'RiskLens: security assistant and pizza shop finder',
    imports: [
        ConfigModule.forRoot(),
        SecurityAssistantModule,
    ],
})
export class AppModule {}
