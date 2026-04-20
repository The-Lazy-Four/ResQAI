// =====================================================
// AI TEMPLATE GENERATOR
// Generates dynamic templates for "custom" org types
// Falls back to RESCUE_TEMPLATES.other if AI fails
// =====================================================

const AI_TEMPLATE_DEBUG = true;

/**
 * Generate a custom template via AI for org type "other"
 * @param {Object} systemData - Current system wizard data
 * @returns {Promise<Object>} Template object matching RESCUE_TEMPLATES shape
 */
async function generateAITemplate(systemData) {
    if (AI_TEMPLATE_DEBUG) console.group('🤖 [AI-TEMPLATE] Generating custom template');

    const description = systemData.customDescription || systemData.organizationName || 'custom organization';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        console.log('[AI-TEMPLATE] Calling /api/custom-system/generate-template');
        console.log('[AI-TEMPLATE] Description:', description);

        const response = await fetch('/api/custom-system/generate-template', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth-token') || ''}`
            },
            body: JSON.stringify({
                organizationType: 'custom',
                customDescription: description,
                structure: systemData.structure,
                staff: systemData.staff
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (!data.template) {
            throw new Error('No template in response');
        }

        // Validate the AI-generated template has required shape
        if (!validateTemplateShape(data.template)) {
            console.warn('[AI-TEMPLATE] ⚠️ AI template failed validation, using defaults');
            throw new Error('Template validation failed');
        }

        // Merge AI template with defaults to fill any gaps
        const aiTemplate = mergeWithDefaults(data.template);

        console.log('[AI-TEMPLATE] ✅ AI template generated successfully');
        if (AI_TEMPLATE_DEBUG) console.groupEnd();

        return aiTemplate;

    } catch (error) {
        console.warn('[AI-TEMPLATE] ⚠️ AI generation failed:', error.message);
        console.log('[AI-TEMPLATE] Using fallback template (RESCUE_TEMPLATES.other)');

        if (AI_TEMPLATE_DEBUG) console.groupEnd();

        // Return the default "other" template as fallback
        return getTemplate('other');
    }
}

/**
 * Merge AI-generated template with defaults to ensure no missing fields
 */
function mergeWithDefaults(aiTemplate) {
    const defaults = getTemplate('other');

    return {
        name: aiTemplate.name || defaults.name,
        description: aiTemplate.description || defaults.description,
        icon: aiTemplate.icon || defaults.icon,
        dashboardSections: aiTemplate.dashboardSections || defaults.dashboardSections,
        emergencyTypes: (aiTemplate.emergencyTypes && aiTemplate.emergencyTypes.length > 0)
            ? aiTemplate.emergencyTypes.map(et => ({
                id: et.id || 'unknown',
                icon: et.icon || '⚠️',
                label: et.label || et.id || 'Emergency',
                color: et.color || '#ff4444'
            }))
            : defaults.emergencyTypes,
        staffRoles: (aiTemplate.staffRoles && aiTemplate.staffRoles.length > 0)
            ? aiTemplate.staffRoles.map(sr => ({
                value: sr.value || sr.label?.toLowerCase().replace(/\s+/g, '_') || 'role',
                label: sr.label || sr.value || 'Staff Role'
            }))
            : defaults.staffRoles,
        featureSections: aiTemplate.featureSections || defaults.featureSections,
        evacuationSteps: (aiTemplate.evacuationSteps && aiTemplate.evacuationSteps.length > 0)
            ? aiTemplate.evacuationSteps
            : defaults.evacuationSteps,
        safetyTips: (aiTemplate.safetyTips && aiTemplate.safetyTips.length > 0)
            ? aiTemplate.safetyTips
            : defaults.safetyTips,
        emergencyContacts: aiTemplate.emergencyContacts || defaults.emergencyContacts,
        // Preserve original defaults for wizard
        defaultFloors: defaults.defaultFloors,
        defaultRooms: defaults.defaultRooms,
        defaultBuildings: defaults.defaultBuildings,
        riskTypes: aiTemplate.riskTypes || defaults.riskTypes,
        roles: defaults.roles
    };
}
