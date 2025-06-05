require('dotenv').config();
const http = require('http');
const OpenAI = require('openai');

// Log startup information
console.log('Starting CostIndex API server...');
console.log('Node version:', process.version);

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('WARNING: OPENAI_API_KEY environment variable not set. ChatGPT functionality will not work.');
  console.error('Please set the OPENAI_API_KEY environment variable with a valid OpenAI API key.');
} else {
  console.log('OPENAI_API_KEY is set. ChatGPT integration is ready.');
}

// OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Constants
const MODEL = "gpt-3.5-turbo"; // Using gpt-3.5-turbo for better compatibility with existing API keys
console.log('Using OpenAI model:', MODEL);

// Helper functions for OpenAI API
async function chatWithUser(message, userId, context) {
  try {
    console.log(`ChatWithUser called: message=${message.substring(0, 30)}..., userId=${userId}, context=${context ? 'provided' : 'none'}`);
    
    const systemPrompt = context 
      ? `You are a helpful shopping assistant for the CostIndex Chrome extension. Help the user with their shopping needs and provide practical advice for saving money. 
         Context about the user's current shopping activity: ${context}`
      : `You are a helpful shopping assistant for the CostIndex Chrome extension. Help the user with their shopping needs and provide practical advice for saving money.`;

    console.log(`Preparing OpenAI request with model: ${MODEL}`);
    console.log(`System prompt: ${systemPrompt.substring(0, 50)}...`);
    
    if (!openai || !openai.chat || !openai.chat.completions) {
      console.error("OpenAI client not properly initialized!");
      throw new Error("OpenAI client not properly initialized. Check API key.");
    }
    
    try {
      console.log("Sending request to OpenAI API...");
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 800
      });
      
      console.log("Received response from OpenAI:", JSON.stringify(response.choices[0]).substring(0, 100));
      
      if (!response.choices || response.choices.length === 0) {
        console.error("Empty choices array in OpenAI response");
        throw new Error("Empty response from OpenAI API");
      }
      
      const content = response.choices[0].message.content;
      console.log(`Response content length: ${content ? content.length : 0}`);
      
      return content || "I'm sorry, I couldn't generate a response.";
    } catch (apiError) {
      console.error("Error in OpenAI API call:", apiError);
      
      // Check if this is an API key issue
      if (apiError.message && (
          apiError.message.includes('API key') || 
          apiError.message.includes('authentication') ||
          apiError.message.includes('key')
      )) {
        throw new Error("OpenAI API key issue. Please check your API key configuration.");
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error("Error in chatWithUser:", error);
    throw new Error("Failed to get response from AI assistant: " + (error.message || "Unknown error"));
  }
}

// Function to suggest cheaper alternatives based on product information
async function suggestAlternatives(productData) {
  try {
    const prompt = `
      I need suggestions for cheaper alternatives to this product:
      
      Product: ${productData.productName}
      Current Price: ${productData.price}
      Store: ${productData.store}
      Category: ${productData.category || "Unknown"}
      
      Please suggest 2-3 specific cheaper alternatives with these details:
      1. Alternative product name
      2. Estimated price (same currency as original)
      3. Approximate savings percentage
      4. Brief reason why it's a good alternative
      5. Where to buy (store or website)
      
      Also provide general money-saving advice related to this type of product.
      
      Format your response as JSON with this structure:
      {
        "suggestions": [
          {
            "name": "Alternative Product Name",
            "estimatedPrice": "Price with currency symbol",
            "savingsPercent": Percentage as number (no % symbol),
            "reason": "Brief explanation of why this is a good alternative",
            "whereToBuy": "Store or website name"
          }
        ],
        "generalAdvice": "General money-saving advice related to this product category"
      }
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { 
          role: "system", 
          content: "You are a shopping assistant with extensive knowledge of products, prices, and value alternatives. Provide realistic alternatives based on the features that truly matter for the type of product. Always maintain a balance between price and quality in recommendations." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsedResponse = JSON.parse(content);
    return parsedResponse;
  } catch (error) {
    console.error("Error generating product alternatives:", error);
    throw new Error("Failed to generate product alternatives: " + (error.message || "Unknown error"));
  }
}

// Function to analyze a product page and provide contextual insight
async function analyzeProductPage(pageData, location = "United States") {
  try {
    const prompt = `
      Analyze this product and provide shopping insights based on the location: ${location}
      
      Product: ${pageData.productName}
      Price: ${pageData.price}
      Store: ${pageData.store}
      Category: ${pageData.category || "Unknown"}
      URL: ${pageData.url}
      Description: ${pageData.description || "Not provided"}

      Price Comparison:
      Compare the price of "${pageData.productName}" across the following stores:
      - Amazon
      - Walmart
      - Kroger

      Provide the following information in JSON format:
      1. Price analysis (is this a good price compared to the market?)
      2. Buying advice (should they buy now, wait, consider alternatives?)
      3. When to buy (is there a better time to purchase this?)
      4. Warning flags (any red flags about this product or listing)

      **Include the price comparison**:
      - The lowest price for the product across all stores.
      - The average price across stores.
      - The highest price for the product across stores.
      
      **Provide product links** for each store, with the format:
      Amazon link: https://www.amazon.com/s?k=<product-name>
      Walmart link: https://www.walmart.com/search?q=<product-name>
      Kroger link: https://www.kroger.com/

      The comparison should look like this:
      {
        "priceComparison": {
          "lowestPrice": "$179.99",
          "averagePrice": "$189.99",
          "highestPrice": "$199.99",
          "comparisonDetails": [
            {
              "store": "Amazon",
              "product": "${pageData.productName}",
              "price": "$199.99",
              "actions": "View",
              "link": "https://www.amazon.com/s?k=${encodeURIComponent(pageData.productName)}"
            },
            {
              "store": "Walmart",
              "product": "${pageData.productName}",
              "price": "$189.99",
              "actions": "View",
              "link": "https://www.walmart.com/search?q=${encodeURIComponent(pageData.productName)}"
            },
            {
              "store": "Kroger",
              "product": "${pageData.productName}",
              "price": "$179.99",
              "actions": "Best Price View",
              "link": "https://www.kroger.com/search?q=${encodeURIComponent(pageData.productName)}"
            }
          ]
        }
      }

      Format your response like this:
      {
        "priceAnalysis": "Analysis of whether this price is good or not",
        "buyingAdvice": "Advice on whether to purchase now",
        "whenToBuy": "Timing advice for this purchase",
        "warningFlags": ["Warning 1", "Warning 2"],
        "priceComparison": {
          "lowestPrice": "$179.99",
          "averagePrice": "$189.99",
          "highestPrice": "$199.99",
          "comparisonDetails": [
            {
              "store": "Amazon",
              "product": "${pageData.productName}",
              "price": "$199.99",
              "actions": "View",
              "link": "https://www.amazon.com/s?k=${encodeURIComponent(pageData.productName)}"
            },
            {
              "store": "Walmart",
              "product": "${pageData.productName}",
              "price": "$189.99",
              "actions": "View",
              "link": "https://www.walmart.com/search?q=${encodeURIComponent(pageData.productName)}"
            },
            {
              "store": "Kroger",
              "product": "${pageData.productName}",
              "price": "$179.99",
              "actions": "Best Price View",
              "link": "https://www.kroger.com/search?q=${encodeURIComponent(pageData.productName)}"
            }
          ]
        }
      }
    `;

    // Sending request to OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or another model you're using
      messages: [
        { 
          role: "system", 
          content: "You are a shopping assistant with expertise in product pricing, market trends, and consumer protection. Provide practical, actionable advice to help users make informed purchasing decisions."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.7, 
      max_tokens: 800
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Parsing the response to JSON
    const parsedResponse = JSON.parse(content);

    // Returning the structured response
    return parsedResponse;
  } catch (error) {
    console.error("Error analyzing product page:", error);
    throw new Error("Failed to analyze product page: " + (error.message || "Unknown error"));
  }
}

// Smart basket analysis to provide insights on the entire basket
// Helper function to send JSON responses
function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(data ? JSON.stringify(data) : '');
}

async function analyzeBasket(basketItems) {
  try {
    const itemsText = basketItems.map(item => 
      `- ${item.productName} (${item.price}) from ${item.store || 'Unknown store'}`
    ).join('\n');

    const prompt = `
      Analyze this shopping basket and provide money-saving insights:
      
      ITEMS:
      ${itemsText}
      
      Please provide:
      1. Total savings opportunity (estimate how much could be saved)
      2. 2-3 specific recommendations for this basket
      3. Substitution ideas (which items could be replaced with cheaper alternatives)
      4. Prioritization advice (which items are worth the price vs. which could be reconsidered)
      
      Format your response as JSON with this structure:
      {
        "totalSavingsOpportunity": "Estimated total savings with explanation",
        "recommendations": ["Recommendation 1", "Recommendation 2"],
        "substitutionIdeas": [
          {
            "original": "Original product name",
            "alternative": "Suggested alternative",
            "estimatedSavings": "Estimated savings with currency"
          }
        ],
        "prioritizationAdvice": "Advice on which items to prioritize or reconsider"
      }
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { 
          role: "system",
          content: "You are a smart shopping assistant that helps people save money on their purchases. You have expertise in price comparison, product alternatives, and shopping optimization. Provide practical and realistic advice."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsedResponse = JSON.parse(content);
    return parsedResponse;
  } catch (error) {
    console.error("Error analyzing shopping basket:", error);
    throw new Error("Failed to analyze shopping basket: " + (error.message || "Unknown error"));
  }
}

// Create server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Parse URL to get pathname
  if (!req.url) {
    sendJsonResponse(res, 400, { error: 'Invalid request URL' });
    return;
  }
  
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  
  try {
    // Serve test pages
    if (pathname === '/test' || pathname === '/test-page') {
      const fs = require('fs');
      const path = require('path');
      
      try {
        const filePath = path.join(process.cwd(), 'test-page.html');
        const content = fs.readFileSync(filePath, 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
        return;
      } catch (error) {
        console.error('Error serving test page:', error);
        sendJsonResponse(res, 500, { error: 'Failed to serve test page' });
        return;
      }
    }
    
    // Serve OpenAI test page
    if (pathname === '/openai-test') {
      const fs = require('fs');
      const path = require('path');
      
      try {
        const filePath = path.join(process.cwd(), 'openai-test.html');
        const content = fs.readFileSync(filePath, 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
        return;
      } catch (error) {
        console.error('Error serving OpenAI test page:', error);
        sendJsonResponse(res, 500, { error: 'Failed to serve OpenAI test page' });
        return;
      }
    }
    
    // Handle API routes
    if (pathname.startsWith('/api/')) {
      // Parse request body for POST and PUT requests
      let body = '';
      if (req.method === 'POST' || req.method === 'PUT') {
        await new Promise((resolve, reject) => {
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => resolve());
          req.on('error', reject);
        });
      }
      
      // Log the request for debugging
      console.log(`${req.method} ${pathname}`);
      if (body) {
        console.log(`Request body: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
      }
      
      // API ROUTES
      
      // API list endpoint
      if (pathname === '/api') {
        const endpoints = [
          { path: '/api/chat', method: 'POST', description: 'Chat with the AI assistant' },
          { path: '/api/alternatives', method: 'POST', description: 'Get product alternatives' },
          { path: '/api/analyze', method: 'POST', description: 'Generic page analysis endpoint' },
          { path: '/api/analyze-product', method: 'POST', description: 'Analyze product details' },
          { path: '/api/analyze-basket', method: 'POST', description: 'Analyze basket contents' },
          { path: '/api/basket-items', method: 'GET,POST,PUT,DELETE', description: 'Manage basket items' },
          { path: '/api/ping', method: 'GET', description: 'Check if the API is working' },
          { path: '/api/radar/scan-product', method: 'POST,GET', description: 'Scanning Product Prices' }, 
        ];
        sendJsonResponse(res, 200, { endpoints });
        return;
      }
      
      // Basket items endpoints (memory-based implementation for demonstration)
      if (pathname === '/api/basket-items') {
        // Initialize memory storage if it doesn't exist
        if (!global.basketItems) {
          global.basketItems = [];
          global.lastItemId = 1000;
        }
        
        // GET /api/basket-items - list items, optionally filtered by userId
        if (req.method === 'GET') {
          try {
            const params = new URLSearchParams(url.search);
            const userId = params.get('userId');
            
            let items = global.basketItems;
            
            // Filter by userId if provided
            if (userId) {
              items = items.filter(item => item.userId == userId);
            }
            
            sendJsonResponse(res, 200, items);
          } catch (error) {
            console.error('Error getting basket items:', error);
            sendJsonResponse(res, 500, { error: 'Failed to get basket items' });
          }
        }
        
        // POST /api/basket-items - create a new item
        else if (req.method === 'POST') {
          try {
            const itemData = JSON.parse(body);
            
            // Validate required fields
            if (!itemData.productName || !itemData.price) {
              sendJsonResponse(res, 400, { error: 'Product name and price are required' });
              return;
            }
            
            // Create new item with generated ID
            const newItem = {
              id: ++global.lastItemId,
              userId: itemData.userId || 0,
              productName: itemData.productName,
              price: itemData.price,
              store: itemData.store || null,
              category: itemData.category || null,
              imageUrl: itemData.imageUrl || null,
              dateAdded: new Date(),
              isRegularPurchase: itemData.isRegularPurchase || 0
            };
            
            global.basketItems.push(newItem);
            
            sendJsonResponse(res, 201, newItem);
          } catch (error) {
            console.error('Error creating basket item:', error);
            sendJsonResponse(res, 500, { error: 'Failed to create basket item' });
          }
        }
        
        // No matching method
        else {
          sendJsonResponse(res, 405, { error: 'Method not allowed' });
        }
      }
      
      // Individual basket item endpoints
      else if (pathname.match(/^\/api\/basket-items\/\d+$/)) {
        const itemId = parseInt(pathname.split('/').pop());
        
        if (!global.basketItems) {
          global.basketItems = [];
          sendJsonResponse(res, 404, { error: 'Item not found' });
          return;
        }
        
        const itemIndex = global.basketItems.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) {
          sendJsonResponse(res, 404, { error: 'Item not found' });
          return;
        }
        
        // PUT /api/basket-items/:id - update an item
        if (req.method === 'PUT') {
          try {
            const updateData = JSON.parse(body);
            const item = global.basketItems[itemIndex];
            
            // Update fields
            Object.assign(item, {
              productName: updateData.productName || item.productName,
              price: updateData.price || item.price,
              store: updateData.store !== undefined ? updateData.store : item.store,
              category: updateData.category !== undefined ? updateData.category : item.category,
              imageUrl: updateData.imageUrl !== undefined ? updateData.imageUrl : item.imageUrl,
              isRegularPurchase: updateData.isRegularPurchase !== undefined ? updateData.isRegularPurchase : item.isRegularPurchase
            });
            
            sendJsonResponse(res, 200, item);
          } catch (error) {
            console.error('Error updating basket item:', error);
            sendJsonResponse(res, 500, { error: 'Failed to update basket item' });
          }
        }
        
        // DELETE /api/basket-items/:id - delete an item
        else if (req.method === 'DELETE') {
          global.basketItems.splice(itemIndex, 1);
          sendJsonResponse(res, 204, null);
        }
        
        // GET /api/basket-items/:id - get a single item
        else if (req.method === 'GET') {
          sendJsonResponse(res, 200, global.basketItems[itemIndex]);
        }
        
        // No matching method
        else {
          sendJsonResponse(res, 405, { error: 'Method not allowed' });
        }
      }
      
      // Chat endpoint
      else if (pathname === '/api/chat') {
        if (req.method === 'POST') {
          try {
            const { message, userId, context } = JSON.parse(body);
            console.log(`Processing chat request from ${userId || 'anonymous'}: "${message.substring(0, 50)}..."`);
            const reply = await chatWithUser(message, userId || 'anonymous', context);
            sendJsonResponse(res, 200, { reply });
          } catch (error) {
            console.error('Chat error:', error);
            sendJsonResponse(res, 500, { error: error.message || 'Error communicating with AI' });
          }
        } else {
          // For non-POST methods, explain what's needed
          sendJsonResponse(res, 400, { 
            error: 'This endpoint requires a POST request with a JSON body containing message, userId, and optional context' 
          });
        }
      }
      
      // Alternatives endpoint
      else if (pathname === '/api/alternatives') {
        if (req.method === 'POST') {
          try {
            const productData = JSON.parse(body);
            console.log(`Processing alternatives request for ${productData.productName}`);
            const alternatives = await suggestAlternatives(productData);
            sendJsonResponse(res, 200, alternatives);
          } catch (error) {
            console.error('Alternatives error:', error);
            sendJsonResponse(res, 500, { error: error.message || 'Failed to generate alternatives' });
          }
        } else {
          sendJsonResponse(res, 400, { 
            error: 'This endpoint requires a POST request with product data' 
          });
        }
      }
      
      // Product analysis endpoint
      else if (pathname === '/api/analyze-product') {
        if (req.method === 'POST') {
          try {
            const pageData = JSON.parse(body);
            console.log(`Processing product analysis for ${pageData.productName}`);
            const analysis = await analyzeProductPage(pageData, location);
            sendJsonResponse(res, 200, analysis);
          } catch (error) {
            console.error('Product analysis error:', error);
            sendJsonResponse(res, 500, { error: error.message || 'Failed to analyze product' });
          }
        } else {
          sendJsonResponse(res, 400, { 
            error: 'This endpoint requires a POST request with product page data' 
          });
        }
      }
      
      // Basket analysis endpoint
      else if (pathname === '/api/analyze-basket') {
        if (req.method === 'POST') {
          try {
            const data = JSON.parse(body);
            if (!data.items || !Array.isArray(data.items)) {
              sendJsonResponse(res, 400, { error: 'Request body must contain an items array' });
              return;
            }
            console.log(`Processing basket analysis for ${data.items.length} items`);
            const analysis = await analyzeBasket(data.items);
            sendJsonResponse(res, 200, analysis);
          } catch (error) {
            console.error('Basket analysis error:', error);
            sendJsonResponse(res, 500, { error: error.message || 'Failed to analyze basket' });
          }
        } else {
          sendJsonResponse(res, 400, { 
            error: 'This endpoint requires a POST request with basket items data' 
          });
        }
      }
      
      // Simple endpoint to test if the API is working
      else if (pathname === '/api/ping') {
        sendJsonResponse(res, 200, { 
          status: 'ok', 
          message: 'API server is running',
          openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
          time: new Date().toISOString()
        });
      }
      
      // Simple OpenAI test endpoint
      else if (pathname === '/api/test-openai') {
        try {
          console.log('OpenAI test endpoint called');
          
          // Simple check if OpenAI is configured
          if (!process.env.OPENAI_API_KEY) {
            sendJsonResponse(res, 500, { 
              success: false, 
              error: 'OpenAI API key is not configured'
            });
            return;
          }
          
          // Test actual API call
          if (req.method === 'GET') {
            console.log('Testing OpenAI connection...');
            
            // Use the existing chatWithUser function
            chatWithUser('Hello, can you give me a very short test response?', 'test-user')
              .then(response => {
                console.log('OpenAI test successful:', response.substring(0, 50) + '...');
                sendJsonResponse(res, 200, { 
                  success: true, 
                  message: 'OpenAI API is working correctly',
                  response: response
                });
              })
              .catch(error => {
                console.error('OpenAI test failed:', error);
                sendJsonResponse(res, 500, { 
                  success: false, 
                  error: 'Failed to communicate with OpenAI API: ' + error.message
                });
              });
            
            // Don't return here - async callback will handle the response
          } else {
            sendJsonResponse(res, 405, { error: 'Method not allowed' });
          }
        } catch (error) {
          console.error('Error in test-openai endpoint:', error);
          sendJsonResponse(res, 500, { 
            success: false, 
            error: 'Internal server error: ' + error.message
          });
        }
        return;
      }
      
      // List available endpoints
      else if (pathname === '/api') {
        sendJsonResponse(res, 200, { 
          endpoints: [
            { path: '/api/chat', method: 'POST', description: 'Chat with the AI assistant' },
            { path: '/api/alternatives', method: 'POST', description: 'Get product alternatives' },
            { path: '/api/analyze', method: 'POST', description: 'Generic page analysis endpoint' },
            { path: '/api/analyze-product', method: 'POST', description: 'Analyze product details' },
            { path: '/api/analyze-basket', method: 'POST', description: 'Analyze basket contents' },
            { path: '/api/ping', method: 'GET', description: 'Check if the API is working' }
          ]
        });
      }
      
      // Generic analyze endpoint - to support content.js calling /api/analyze
      else if (pathname === '/api/analyze') {
        if (req.method === 'POST') {
          try {
            const data = JSON.parse(body);
            console.log(`Processing product analysis for ${data.productName || 'unknown product'}`);
            
            // Check if we received direct product data or page content
            let productData;
            let location;
            
            if (data.productName) {
              // Direct product data
              productData = {
                productName: data.productName || 'Unknown Product',
                price: data.price || '$0.00',
                store: data.store || 'Unknown Store',
                url: data.url || 'https://example.com',
                description: data.description || 'No description provided',
                category: data.category
              };
              location = data.location || 'United States';
            } else if (data.pageContent) {
              // Extracted from page content
              productData = {
                productName: data.pageContent.split('\n')[0] || 'Unknown Product',
                price: (data.pageContent.match(/\$\d+\.\d{2}/) || ['$0.00'])[0],
                store: new URL(data.pageUrl || 'https://example.com').hostname,
                url: data.pageUrl || 'https://example.com',
                description: data.pageContent || 'No description provided'
              };
              location = data.location || 'United States';
            } else {
              throw new Error('Invalid product data format');
            }
            
            const analysis = await analyzeProductPage(productData, location);
            sendJsonResponse(res, 200, analysis);
          } catch (error) {
            console.error('Product analysis error:', error);
            sendJsonResponse(res, 500, { error: error.message || 'Failed to analyze product' });
          }
        } else {
          sendJsonResponse(res, 400, { 
            error: 'This endpoint requires a POST request with product data' 
          });
        }
      }
      // Not found
      else {
        sendJsonResponse(res, 404, { error: 'Not found' });
      }
    } else {
      // Welcome page
      if (pathname === '/' || pathname === '') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>CostIndex Extension Server</title>
              <style>
                body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1 { color: #4a6cfa; }
                .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; }
                .method { font-weight: bold; color: #4a6cfa; }
              </style>
            </head>
            <body>
              <h1>CostIndex Extension Server</h1>
              <p>This server provides API endpoints for the CostIndex Chrome Extension.</p>
              <h2>Available Endpoints:</h2>
              <div class="endpoint">
                <div><span class="method">POST</span> /api/chat</div>
                <p>Chat with the AI shopping assistant</p>
              </div>
              <div class="endpoint">
                <span class="method">POST</span> /api/alternatives
                <p>Get alternative product suggestions</p>
              </div>
              <div class="endpoint">
                <span class="method">POST</span> /api/analyze-product
                <p>Analyze product details and pricing</p>
              </div>
              <div class="endpoint">
                <span class="method">POST</span> /api/analyze-basket
                <p>Analyze shopping basket contents</p>
              </div>
              <div class="endpoint">
                <span class="method">GET</span> /api/ping
                <p>Check if the API server is working</p>
              </div>
              <div class="endpoint">
                <span class="method">GET</span> /test
                <p>Test page for the Chrome extension</p>
              </div>
              <div class="endpoint">
                <span class="method">GET</span> /openai-test
                <p>Test page for the OpenAI integration</p>
              </div>
              <hr>
              <p>Server status: <span style="color: green">Running</span></p>
              <p>OpenAI API: <span style="color: ${process.env.OPENAI_API_KEY ? 'green' : 'red'}">${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}</span></p>
            </body>
          </html>
        `);
        return;
      }
      
      // Serve static files or 404
      sendJsonResponse(res, 404, { error: 'Not found' });
    }
  } catch (error) {
    console.error('Server error:', error);
    sendJsonResponse(res, 500, { error: 'Internal server error' });
  }
});

function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});