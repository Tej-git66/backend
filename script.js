const express = require('express'); 
const dotenv = require('dotenv');  
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');
const { put } = require('@vercel/blob');

dotenv.config();

const app = express();
const port = 3000; 

const corsOptions = {
  origin: '*', // Allow requests from the React Native app
  methods: ['GET', 'POST'], // Specify the allowed methods
};

app.use(cors(corsOptions));

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const uploadMiddleware = multer({ storage }); 

// Middleware to parse JSON request bodies
app.use(express.json());

app.post('/process-image', uploadMiddleware.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded.' });
    }

     const blob = await put(req.file.originalname, req.file.buffer, {
      access: 'public', 
    });

    const blobUrl = blob.url;

    const apiKey = process.env.OPENAI_API_KEY;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract all business cards from the image and return them as an array in plain JSON format, without any additional text or formatting.

### **Data Extraction Rules:**

#### **1. General Requirements:**
- Extract all relevant details present on the business card, including name, company, phone numbers (office, mobile, fax if available), email, address, website, and job title.
- If a field is missing, omit it from the JSON output (do not return empty or null values).
- Ensure all extracted information is returned as an array, even if only one business card is found.

#### **2. Phone Number Mapping:**
- If a phone number is **explicitly labeled** as **"Office"** or **"Fax"**, use that label.
- **All other numbers (including unlabeled ones) should be categorized as "Mobile".**
- If a number has an **extension** (e.g., "x123" or "ext."), classify it as **"Office"**.
- If multiple numbers are present **without labels**, **all should be categorized as "Mobile"**.
- Include **all phone numbers** in the JSON output.
- If multiple mobile numbers exist, store them in an **array** under "mobile".

#### **3. Handling Missing Name:**
- If the **name** field is missing, generate a placeholder **name** using the company name:
  - Extract the **first two words** from the **company name** and use them as the **name**.
  - If the company name has only **one word**, repeat it to create a two-word name.
  - Example:
    - **Company Name:** "Sprint1 Ventures" → "Sprint1 Ventures"
    - **Company Name:** "Apple" → "Apple Apple"

#### **4. Handling Missing Company Name:**
- If the **company name** is missing on the card:
  - Look for any **registered symbols** (®, ™) or brand names **present on the card** and map that as the company name.
  - If a clear **brand or logo name is found**, use that as the **company name**.
  - If no such indicators are found, omit the **company_name** field.
  - Example:
    - **Card displays "TechCorp™" but no company field** → "company_name": "TechCorp"
    - **Card has a logo with "Streamline Freight®" but no text** → "company_name": "Streamline Freight"

---

### **Example Outputs for Different Scenarios:**

#### **Example 1: Complete Information Available**

[
    {
        "name": "John Doe",
        "company_name": "Tech Solutions Inc.",
        "phone": {
            "office": "+1 555-123-4567",
            "mobile": ["+1 555-987-6543"],
            "fax": "+1 555-567-8901"
        },
        "email": "john.doe@techsolutions.com",
        "address": "1234 Elm Street, New York, NY, USA",
        "website": "www.techsolutions.com",
        "job_title": "CEO"
    }
]
Example 2: Missing Name (Use First Two Words from Company Name)

[
    {
        "name": "Global Systems",
        "company_name": "Global Systems Corporation",
        "phone": {
            "mobile": ["+1 555-321-7890"]
        },
        "email": "info@globalsystems.com",
        "address": "789 Market Street, San Francisco, CA, USA",
        "website": "www.globalsystems.com",
        "job_title": "Operations Manager"
    }
]
Example 3: Multiple Phone Numbers Without Labels (Default to Mobile)

[
    {
        "name": "Alice Johnson",
        "company_name": "Creative Designs LLC",
        "phone": {
            "mobile": ["+1 555-111-2222", "+1 555-333-4444"]
        },
        "email": "alice@creativedesigns.com",
        "address": "456 Design Road, Chicago, IL, USA",
        "website": "www.creativedesigns.com",
        "job_title": "Founder"
    }
]
Example 4: Phone Number Explicitly Labeled as Office or Fax

[
    {
        "name": "Michael Brown",
        "company_name": "Brown & Associates",
        "phone": {
            "office": "+1 555-777-8888",
            "fax": "+1 555-999-0000"
        },
        "email": "michael@brownassociates.com",
        "address": "101 Business Ave, Dallas, TX, USA",
        "website": "www.brownassociates.com",
        "job_title": "Managing Partner"
    }
]
Example 5: Name & Phone Labels Missing (Default to Company Name & Mobile)

[
    {
        "name": "Next Gen",
        "company_name": "Next Gen Technologies",
        "phone": {
            "mobile": ["+1 555-222-3333", "+1 555-444-5555"]
        },
        "email": "contact@nextgentech.com",
        "address": "555 Innovation Street, Austin, TX, USA",
        "website": "www.nextgentech.com",
        "job_title": "Tech Lead"
    }
]
Example 6: Missing Company Name (Extract from Registered Symbol)

[
    {
        "name": "David Smith",
        "company_name": "InnovaTech®",
        "phone": {
            "mobile": ["+1 555-555-5555"]
        },
        "email": "david@innovatech.com",
        "address": "77 Future Drive, Seattle, WA, USA",
        "website": "www.innovatech.com",
        "job_title": "CTO"
    }
]
Example 7: Missing Company Name (Extract from Logo/Brand)

[
    {
        "name": "Elena Carter",
        "company_name": "EcoPower",
        "phone": {
            "mobile": ["+1 555-666-7777"]
        },
        "email": "elena@ecopower.com",
        "address": "Green Building, Denver, CO, USA",
        "website": "www.ecopower.com",
        "job_title": "Sustainability Consultant"
    }
]
Final Output Requirements:
Always return results in valid JSON array format.
Exclude fields that are not available on the card (do not include empty or null fields).
Ensure all business cards are included in the array, even if only one is found.`
            },
            {
              type: 'image_url',
              image_url: {
                url: blobUrl 
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    };

    const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, { headers });

    // Debugging: Log the full API response
    console.log("Full OpenAI API Response:", JSON.stringify(response.data, null, 2));

    const extractedText = response.data.choices[0].message.content;

    if (!extractedText) {
      console.error("Error: extractedText is undefined");
      return res.status(400).json({ error: "Failed to extract text from OpenAI response" });
    }

    let cleanedText = extractedText;

// **Check if extractedText is already an object**
if (typeof extractedText === "object") {
    console.log("Extracted text is already an object, using directly.");
    cleanedText = extractedText;
} else if (typeof extractedText === "string") {
    cleanedText = extractedText.trim();

    // **Remove Markdown-style JSON block markers** (` ```json ... ``` `)
    cleanedText = cleanedText.replace(/^```json/, '').trim();
    cleanedText = cleanedText.replace(/```$/, '').trim();

    // **Ensure only the JSON part is extracted**
    const jsonStart = cleanedText.indexOf("[");
    const jsonEnd = cleanedText.lastIndexOf("]") + 1;
    if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd);
    }

    // **Try parsing JSON safely**
    try {
        cleanedText = JSON.parse(cleanedText);
    } catch (error) {
        console.error('Error parsing JSON:', error.message);
        console.error('Failed Text:', cleanedText); // Log raw text for debugging
        return res.status(400).json({ error: 'Failed to parse extracted data.' });
    }
}

// **Ensure final output is an array**
if (!Array.isArray(cleanedText)) {
    cleanedText = [cleanedText];
}

console.log("Extracted Data:", JSON.stringify(cleanedText, null, 2));
res.json({ message: 'Data extracted successfully', extractedText: cleanedText });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
});

module.exports = app; 
