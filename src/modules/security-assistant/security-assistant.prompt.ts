import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { SecurityAssistantService } from './security-assistant.service.js';

export class SecurityAssistantPrompts {
    constructor(private securityService: SecurityAssistantService) { }

    @Prompt({
        name: 'generate_security_report',
        description: 'Generate a comprehensive security audit report as a PDF file',
        arguments: [
            {
                name: 'project_path',
                description: 'Optional path to the project to scan. Defaults to current working directory.',
                required: false
            },
            {
                name: 'github_repo',
                description: 'Optional GitHub repository to scan (e.g., "owner/repo")',
                required: false
            }
        ]
    })
    async getSecurityReportPrompt(
        args: { project_path?: string; github_repo?: string },
        context: ExecutionContext
    ) {
        const projectPath = args.project_path || process.cwd();
        const targetDescription = args.github_repo
            ? `GitHub repository: ${args.github_repo}`
            : `Local project: ${projectPath}`;

        return [
            {
                role: 'user' as const,
                content: {
                    type: 'text' as const,
                    text: `Generate a comprehensive security audit report for the following project:

Target: ${targetDescription}

The report should include:
1. Executive summary with total vulnerability counts by severity (Critical, High, Moderate, Low, Info)
2. Detailed vulnerability list with:
   - Package name
   - Severity level
   - Vulnerability title/description
   - Affected version range
   - Available fixes

The report will be generated as a PDF file and saved to:
📁 security-reports/security-report-<timestamp>.pdf

This folder is located in the project directory where the code is running: ${process.cwd()}

Please analyze the project dependencies and generate the security report now.`
                }
            }
        ];
    }
}