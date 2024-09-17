import { WebSocketServer } from "ws";
import Resource from "./models/Resource";

// Utility function to send poll data or errors back to the client
function sendResponse(ws: any, resource: any, error: string | null = null) {
  const response = JSON.stringify({
    resource,
    error,
  });
  ws.send(response);
}

// Broadcast function to send poll data to all connected clients
function broadcastPollUpdate(wss: WebSocketServer, resource: any) {
  const pollData = JSON.stringify({ resource });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(pollData);
    }
  });
}

// WebSocket setup and initialization function
export const initializeWebSocket = (server: any) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection established");

    ws.on("message", async (message) => {
      const data = JSON.parse(message.toString());

      // Fetch poll based on accessKey and sessionId
      if (data.type === "fetch_poll") {
        const { accessKey, sessionId } = data;

        try {
          const poll = await Resource.findOne({
            accessKey,
            sessionId,
          })
            .select("accessKey sessionId content")
            .exec();

          sendResponse(ws, poll || null, poll ? null : "Resource not found");
        } catch (error) {
          console.error("Error fetching poll:", error);
          sendResponse(ws, null, "Error fetching poll");
        }
      }

      // Update active question
      if (data.type === "update_active_question") {
        const { qstId, accessKey, sessionId } = data;
        console.log("Updating active question:", data);

        try {
          const resource = await Resource.findOne({
            accessKey,
            sessionId,
          })
            .select("accessKey sessionId content")
            .exec();

          if (!resource) {
            sendResponse(ws, null, "Resource not found");
            return;
          }

          let contentToUpdate = JSON.parse(resource.content);
          const questionIndex = contentToUpdate.pollArray.findIndex(
            (question: { qstId: string }) => question.qstId === qstId
          );

          if (questionIndex === -1) {
            sendResponse(ws, null, "Question not found in the content");
            return;
          }

          contentToUpdate.activeQuestion = { qstId };
          resource.content = JSON.stringify(contentToUpdate);
          await resource.save();

          sendResponse(ws, resource); // Send updated resource to the client
          broadcastPollUpdate(wss, resource); // Broadcast the update to all clients
        } catch (error) {
          console.error("Error updating active question:", error);
          sendResponse(ws, null, "Error updating active question");
        }
      }

      // Submit poll response
      if (data.type === "submit_response_event") {
        const {
          qstId,
          selectedAnswer,
          selectedAnswers,
          ranking,
          answer,
          rating,
          accessKey,
          sessionId,
        } = data;

        let response;
        if (selectedAnswer) response = selectedAnswer;
        else if (selectedAnswers) response = selectedAnswers;
        else if (ranking) response = ranking;
        else if (answer) response = answer;
        else if (rating) response = rating;

        if (response === undefined) {
          sendResponse(ws, null, "No valid response provided");
          return;
        }

        try {
          const resource = await Resource.findOne({ accessKey, sessionId })
            .select("accessKey sessionId content")
            .exec();

          if (!resource) {
            sendResponse(ws, null, "Resource not found");
            return;
          }

          let contentToUpdate = JSON.parse(resource.content);
          const questionToUpdate = contentToUpdate.pollArray.find(
            (question: { qstId: string }) => question.qstId === qstId
          );

          if (!questionToUpdate) {
            sendResponse(ws, null, "Question not found");
            return;
          }

          questionToUpdate.responses = questionToUpdate.responses || [];
          if (Array.isArray(response)) {
            questionToUpdate.responses.push(...response);
          } else {
            questionToUpdate.responses.push(response);
          }

          resource.content = JSON.stringify(contentToUpdate);
          await resource.save();

          sendResponse(ws, resource); // Send updated resource to the client
          broadcastPollUpdate(wss, resource); // Broadcast the update to all clients
        } catch (error) {
          console.error("Error submitting response:", error);
          sendResponse(ws, null, "Error submitting response");
        }
      }
      // reset responses
      if (data.type === "reset_all_responses") {
        const { accessKey, sessionId } = data;

        try {
          const resource = await Resource.findOne({ accessKey, sessionId })
            .select("accessKey sessionId content")
            .exec();

          if (!resource) {
            sendResponse(ws, null, "Resource not found");
            return;
          }

          let contentToUpdate = JSON.parse(resource.content);
          const questionsToUpdate = contentToUpdate.pollArray.map(
            (question: any) => question
          );

          if (!questionsToUpdate) {
            sendResponse(ws, null, "Questions not found");
            return;
          }

          // Update each question's responses to an empty array
          questionsToUpdate.forEach((question: { responses: never[] }) => {
            question.responses = [];
          });

          resource.content = JSON.stringify(contentToUpdate);
          await resource.save();

          sendResponse(ws, resource); // Send updated resource to the client
          broadcastPollUpdate(wss, resource); // Broadcast the update to all clients
        } catch (error) {
          console.error("Error submitting response:", error);
          sendResponse(ws, null, "Error submitting response");
        }
      }
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });
  });

  console.log("WebSocket server initialized.");
};
