import { Module } from '@nitrostack/core';
import { SecurityAssistantService } from './security-assistant.service.js';
import { SecurityAssistantTools } from './security-assistant.tools.js';

@Module({
    name: 'security-assistant',
    description: 'MCP developer security assistant: scan dependencies, answer questions, prioritize fixes, and translate security output into actionable guidance',
    controllers: [SecurityAssistantTools],
    providers: [SecurityAssistantService],
})
export class SecurityAssistantModule {}
