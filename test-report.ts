
import { SecurityAssistantService } from './src/modules/security-assistant/security-assistant.service.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function testReport() {
    console.log('Starting report generation test...');
    const service = new SecurityAssistantService();

    try {
        const reportPath = await service.generateReport();
        console.log(`Report generated at: ${reportPath}`);

        if (existsSync(reportPath)) {
            console.log('SUCCESS: Report file exists.');
        } else {
            console.error('FAILURE: Report file does not exist.');
            process.exit(1);
        }
    } catch (error) {
        console.error('Error generating report:', error);
        process.exit(1);
    }
}

testReport();
