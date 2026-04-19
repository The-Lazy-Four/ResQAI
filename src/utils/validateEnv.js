// ============================================
// ResQAI - Environment Validation Utility
// For debugging production deployment issues
// ============================================

export function validateEnvironment() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  🔍 ENVIRONMENT VALIDATION              ║');
    console.log('╚════════════════════════════════════════╝\n');

    const nodeEnv = process.env.NODE_ENV || 'development';
    const port = process.env.PORT || 3000;

    const vars = {
        'NODE_ENV': nodeEnv,
        'PORT': port,
        'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
        'OPENROUTER_API_KEY': process.env.OPENROUTER_API_KEY,
        'GROQ_API_KEY': process.env.GROQ_API_KEY
    };

    let validCount = 0;
    let missingCount = 0;

    for (const [key, value] of Object.entries(vars)) {
        if (key === 'NODE_ENV' || key === 'PORT') {
            console.log(`✅ ${key}: ${value}`);
            validCount++;
        } else if (value && value.trim() && value !== 'your-key') {
            console.log(`✅ ${key}: ${value.slice(0, 15)}...`);
            validCount++;
        } else {
            console.log(`❌ ${key}: NOT SET`);
            missingCount++;
        }
    }

    console.log(`\n📊 Summary: ${validCount} configured, ${missingCount} missing`);

    if (missingCount > 0) {
        console.warn('\n⚠️  PRODUCTION DEPLOYMENT ISSUES:');
        console.warn('   - Check Render environment variables');
        console.warn('   - Or set in .env locally for testing');
        console.warn('   - Never commit .env to git\n');
    } else {
        console.log('\n✅ All critical environment variables are set!\n');
    }

    return {
        valid: missingCount === 0,
        configured: validCount,
        missing: missingCount
    };
}

export function getAIStatus() {
    return {
        gemini: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
        openRouter: !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim()),
        groq: !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()),
        environment: process.env.NODE_ENV || 'development'
    };
}
