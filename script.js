/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Helper function to add a message to the chat window */
function addMessage(text, sender, sources) {
  // Create a new div for the message
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${sender}`;
  if (sender === "ai") {
    // Allow HTML for AI messages (for links, bold, etc.)
    msgDiv.innerHTML = text;

    // If sources are provided, add a sources section
    if (sources && Array.isArray(sources) && sources.length > 0) {
      const sourcesDiv = document.createElement("div");
      sourcesDiv.style.marginTop = "10px";
      sourcesDiv.style.fontSize = "15px";
      sourcesDiv.style.color = "#bca16a";
      sourcesDiv.innerHTML =
        "<b>Sources:</b><ul style='margin: 6px 0 0 18px; color: #bca16a;'>";
      sources.forEach((src) => {
        // Each source should be an object with {title, url}
        if (src.url) {
          sourcesDiv.innerHTML += `<li><a href="${
            src.url
          }" target="_blank" rel="noopener">${src.title || src.url}</a></li>`;
        } else {
          sourcesDiv.innerHTML += `<li>${src.title || src}</li>`;
        }
      });
      sourcesDiv.innerHTML += "</ul>";
      msgDiv.appendChild(sourcesDiv);
    }
  } else {
    // User messages are plain text for safety
    msgDiv.textContent = text;
  }
  chatWindow.appendChild(msgDiv);
  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Store the conversation as an array of messages
const conversation = [
  {
    role: "system",
    content:
      "You are a helpful assistant for L'Oréal. Only answer questions about L'Oréal products, routines, and general company information. If asked about anything else, politely say you can only answer questions about L'Oréal. You may use HTML tags (like <b>, <u>, <a>, <ul>, <li>) to style your answers, show sources, or highlight important information.",
  },
];

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();
  if (!question) return;

  // Hide the placeholder if this is the first message
  if (chatWindow.textContent.trim() === "👋 Hello! How can I help you today?") {
    chatWindow.innerHTML = "";
  }

  // Show user's message
  addMessage(question, "user");
  userInput.value = "";

  // Add user's message to conversation memory
  conversation.push({ role: "user", content: question });

  // Show loading message
  addMessage("Thinking...", "ai");

  try {
    // Send the full conversation to the API
    const response = await fetch(
      "https://lorealchatbot.rbostap1.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: conversation,
        }),
      }
    );

    // Parse the response
    const data = await response.json();

    // Remove the loading message
    const loadingMsg = chatWindow.querySelector(".msg.ai:last-child");
    if (loadingMsg && loadingMsg.textContent === "Thinking...") {
      chatWindow.removeChild(loadingMsg);
    }

    // Show AI's reply (may include HTML and sources)
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      // Try to extract sources if present in response
      let sources = [];
      if (
        data.choices[0].message.function_call &&
        data.choices[0].message.function_call.arguments
      ) {
        try {
          const args = JSON.parse(
            data.choices[0].message.function_call.arguments
          );
          if (args.sources && Array.isArray(args.sources)) {
            sources = args.sources;
          }
        } catch (e) {
          // ignore JSON parse errors
        }
      }
      addMessage(data.choices[0].message.content, "ai", sources);
      // Add AI's reply to conversation memory
      conversation.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
    } else {
      addMessage("Sorry, I couldn't get a response. Please try again.", "ai");
    }
  } catch (error) {
    // Remove the loading message
    const loadingMsg = chatWindow.querySelector(".msg.ai:last-child");
    if (loadingMsg && loadingMsg.textContent === "Thinking...") {
      chatWindow.removeChild(loadingMsg);
    }
    addMessage("Sorry, there was an error connecting to the assistant.", "ai");
  }
});
