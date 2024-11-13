require('dotenv').config(); // Load environment variables from .env file
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY, // This is the default and can be omitted
});

// Function to generate text using OpenAI
async function generateText(prompt) {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7, 
    });

    // Check if the response contains valid data 
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content.trim();
    } else {
      return 'AI failed to respond'
      throw new Error("No response from the model");
    }
  } catch (error) {
    return 'AI failed to respond'
    console.error("Error with OpenAI API:", error.response ? error.response.data : error.message);
    throw new Error("Failed to generate text");
  }
}

// Controller to handle the API request
const generateTextController = async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate that the prompt is provided
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required and must be a string" });
    }

    // Generate the text using the prompt
    const generatedText = await generateText(prompt);

    // Return the generated text in the response
    res.status(200).json({ generatedText });

  } catch (error) {
    // Handle any errors and send an appropriate response
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

module.exports = {
  generateTextController,
  generateText
};
 