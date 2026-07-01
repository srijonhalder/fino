const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyze a business application using Gemini AI
 * Returns a structured credit score and risk assessment
 * @param {object} business - The business document from MongoDB
 * @returns {Promise<object>} AI analysis result
 */
const analyzeBusinessForCredit = async (business) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert credit analyst for a micro-investment platform in India. Analyze this business application and provide a risk assessment.

BUSINESS DETAILS:
- Business Name: ${business.name}
- Category: ${business.category}
- Location: ${business.location?.city}, ${business.location?.state}
- Years in Operation: ${business.yearsInOperation || 'Not provided'}
- Average Monthly Revenue: ₹${business.financials?.averageMonthlyRevenue || 0}
- Profit Margin: ${business.financials?.profitMargin || 0}%
- Total Funding Requested: ₹${business.fundingGoal}
- Revenue Share Percentage Offered to Investors: ${business.revenueSharePercentage}%
- Revenue Sharing Duration: ${business.revenueSharingDuration || 24} months
- Token Price: ₹${business.tokenDetails?.tokenPrice}
- Total Tokens: ${business.tokenDetails?.totalTokens}
- GST Number: ${business.gstNumber ? 'Provided' : 'Not provided'}

RESPOND ONLY AS VALID JSON (no markdown, no code blocks, just raw JSON) with this exact structure:
{
  "creditScore": <number 0-100>,
  "riskRating": "<LOW or MEDIUM or HIGH>",
  "positiveFactors": ["<strength 1>", "<strength 2>", ...],
  "riskFactors": ["<risk 1>", "<risk 2>", ...],
  "recommendation": "<APPROVE or REJECT>",
  "analysisNotes": "<2-3 sentence summary>"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON from response (handle markdown code blocks if any)
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const analysis = JSON.parse(cleanText);

    // Validate required fields
    if (
      typeof analysis.creditScore !== 'number' ||
      !['LOW', 'MEDIUM', 'HIGH'].includes(analysis.riskRating) ||
      !['APPROVE', 'REJECT'].includes(analysis.recommendation)
    ) {
      throw new Error('AI response missing required fields');
    }

    return analysis;
  } catch (error) {
    console.error('❌ Gemini AI analysis failed:', error.message);

    // Return a conservative default assessment
    return {
      creditScore: 50,
      riskRating: 'MEDIUM',
      positiveFactors: ['Business application submitted for review'],
      riskFactors: ['AI analysis could not be completed — manual review recommended'],
      recommendation: 'REJECT',
      analysisNotes:
        'Automated AI analysis failed. This default conservative score requires manual admin review before approval.',
    };
  }
};

module.exports = {
  analyzeBusinessForCredit,
};
