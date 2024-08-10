<template>
  <v-container>
    <!-- Loading Indicator -->
    <div id="loading-indicator" v-if="loading" class="loading-indicator">
      Loading...
    </div>

    <!-- PDF Container -->
    <div
      id="pdf-container"
      ref="pdfContainer"
      style="position: relative; overflow-y: auto; height: 100vh"
      @scroll="handleScroll"
    >
      <!-- PDF Content -->
      <PDF
        :src="pdfUrl"
        ref="pdfImage"
        @onPageChange="updatePageNumber"
        @mousedown="startSelection"
        @page-change="onPageChange"
        style="width: 100%; height: auto"
      />

      <!-- Selection Overlay -->
      <div
        v-if="selectionActive"
        :style="overlayStyle"
        class="selection-overlay"
        id="selectionOverlay"
      ></div>

      <!-- Comment Markers -->
      <div
        v-for="(commentData, index) in filteredComments"
        :key="index"
        :style="commentStyle(commentData)"
        :id="'comment-' + index"
        class="comment-marker"
        @mouseover="showTooltip = index"
        @mouseleave="showTooltip = null"
      >
        <v-tooltip bottom v-if="showTooltip === index">
          <template #activator="{ on, attrs }">
            <v-card
              color="#FFFFCC"
              v-bind="attrs"
              v-on="on"
              style="max-width: 27rem"
            >
              <div class="ma-4 text-h6">{{ commentData.title }}</div>
              <div class="ma-4 text-h7">
                <i>{{ commentData.text }}</i>
              </div>

              <v-divider />
              <v-card-actions>
                <v-card-subtitle class="ml-11" align-right>
                  Added {{ reactiveTimeAgo(Number(commentData.timestamp)) }} by
                  {{ commentData.author }}
                </v-card-subtitle>
              </v-card-actions>
            </v-card>
          </template>
        </v-tooltip>
      </div>
    </div>

    <!-- Comment Dialog -->
    <v-dialog v-model="dialogVisible" max-width="30rem" persistent>
      <v-card>
        <v-card-title>
          <span class="headline ml-2">Add a comment</span>
        </v-card-title>
        <v-divider></v-divider>

        <v-card-text>
          <v-form fast-fail @submit.prevent>
            <v-text-field
              v-model="title"
              :rules="titleRules"
              label="Title"
            ></v-text-field>
            <v-textarea
              v-model="text"
              label="Discussion text"
              rows="3"
              :rules="textRules"
              required
            ></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="outlined" color="primary" @click="saveComment"
            >Save Comment</v-btn
          >
          <v-btn text color="orange" @click="cancelComment">Cancel</v-btn>

          <v-spacer></v-spacer>
        </v-card-actions>
        <br />
      </v-card>
    </v-dialog>

    <!-- Filtered Comments Iterator Dialog -->
    <div
      max-width="350px"
      style="
        position: fixed;
        z-index: 1000;
        box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
      "
      :style="{ top: dialogTop, left: dialogLeft }"
      @mousedown="onMouseDown"
    >
      <v-card ref="draggableCard" class="draggable-card">
        <v-card-title @mousedown.stop="onMouseDown">
          <span class="headline"
            >Page {{ currentPage }} Discussion Comments.</span
          >
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <div class="" v-if="filteredComments.length === 0">
            <h5>No discussion comments added yet.</h5>
          </div>
          <div class="scrollable-list-container" id="draggableComments">
            <v-list>
              <v-list-item-group
                v-for="(comment, index) in filteredComments"
                :key="index"
                :id="'card-' + index"
                @mouseover="highlightComment(index), toggleHoverColorIn(index)"
                @mouseleave="
                  unhighlightComment(index), toggleHoverColorOut(index)
                "
              >
                <v-card :color="hoverColor" flat style="max-width: 27rem">
                  <div class="ma-4 text-h6">{{ comment.title }}</div>
                  <div class="ma-4 text-h7">
                    <i>{{ comment.text }}</i>
                  </div>
                  <v-divider />
                  <v-card-actions>
                    <v-card-subtitle>
                      Added {{ reactiveTimeAgo(Number(comment.timestamp)) }} by
                      {{ comment.author }}
                    </v-card-subtitle>
                  </v-card-actions>
                  <v-divider />
                </v-card>
                <br />
              </v-list-item-group>
            </v-list>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import PDF from "pdf-vue3";
import { usePaperStore } from "../stores/papers";
import { useUserStore } from "../stores/users";
const userStore = useUserStore();
const user = userStore.user;

// Paper store
const paperStore = usePaperStore();
const pdfUrl = paperStore.paper.url;
const commentsDialogVisible = ref(true);
const titleRules = [
  (value) =>
    value?.length > 3 ? true : "Input must be at least 3 characters.",
  (value) =>
    value?.length < 75 ? true : "Input must be at most 70 characters.",
];

const textRules = [
  (value) =>
    value?.length > 15 ? true : "Input must be at least 15 characters.",
  (value) =>
    value?.length < 255 ? true : "Input must be at most 250 characters.",
];

// Refs for managing state
const title = ref("");
const text = ref("");

const comments = ref([]);
const selectionStart = ref({ x: null, y: null });
const selectionEnd = ref({ x: null, y: null });
const selectedArea = ref({ x: null, y: null, width: null, height: null });
const currentPage = ref(1);

const selectionActive = ref(false);
const dialogVisible = ref(false);
const showTooltip = ref(null);
const pdfContainer = ref(null);
const pdfImage = ref(null);
const loading = ref(false);
const hoverColor = ref("#FFFFCC");
let lastScrollTop = 0;
const scrollThreshold = 100;
const dialogTop = ref("6.6rem"); // Initial position
const dialogLeft = ref("75%"); // Initial position
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);

// Methods
function toggleHoverColorIn() {
  hoverColor.value = "#FFFB96";
}
function toggleHoverColorOut() {
  hoverColor.value = "#FFFFCC";
}
const onMouseDown = (event) => {
  if (event.target.closest(".draggable-card")) {
    isDragging.value = true;
    dragStartX.value = event.clientX;
    dragStartY.value = event.clientY;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }
};
// Your existing setup code...

function highlightComment(index) {
  const commentElement = document.getElementById(`comment-${index}`);
  if (commentElement) {
    commentElement.style.backgroundColor = "rgba(255, 255, 0, 0.5)"; // Highlight color
    commentElement.style.border = "2px solid rgba(255, 255, 0, 0.8)"; // Optional border

    // Check if the element is out of view and scroll to it if necessary
    const containerRect = pdfContainer.value.getBoundingClientRect();
    const elementRect = commentElement.getBoundingClientRect();

    if (
      elementRect.top < containerRect.top ||
      elementRect.bottom > containerRect.bottom
    ) {
      pdfContainer.value.scrollTop =
        commentElement.offsetTop - containerRect.top;
    }
  }
}
// Function to update the position of the selection overlay on scroll
function updateOverlayPosition() {
  if (!selectionActive.value) return;

  const pdfImageElement = pdfImage.value.$el;
  const rect = pdfImageElement.getBoundingClientRect();
  const scrollTop = pdfContainer.value.scrollTop;

  const x = Math.min(selectionStart.value.x, selectionEnd.value.x);
  const y = Math.min(selectionStart.value.y, selectionEnd.value.y) - scrollTop;
  const width = Math.abs(selectionStart.value.x - selectionEnd.value.x);
  const height = Math.abs(selectionStart.value.y - selectionEnd.value.y);

  overlayStyle.value = {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: "rgba(0, 0, 255, 0.3)",
    border: "1px solid rgba(0, 0, 255, 0.5)",
    pointerEvents: "none",
  };
}

// Ensure this computed property is kept up to date when selection is active or the scroll occurs
watch(selectionActive, updateOverlayPosition);
watch(selectionEnd, updateOverlayPosition);

// Update the positions of the comment markers and selection overlay on scroll
function handleScroll() {
  const container = pdfContainer.value;

  updateHighlightPositions(); // Update the comment markers
  updateOverlayPosition(); // Update the selection overlay  const pdfImageElement = pdfImage.value.$el;
  const containerRect = container.getBoundingClientRect();
  const pdfRect = pdfImageElement.getBoundingClientRect();

  // Calculate visible area
  const visibleHeight =
    Math.min(containerRect.bottom, pdfRect.bottom) -
    Math.max(containerRect.top, pdfRect.top);
  const totalHeight = pdfRect.height;
  const visibilityPercentage = (visibleHeight / totalHeight) * 100;

  // Check if 90% of the page is visible
  if (visibilityPercentage >= 60) {
    showCommentsForPage(currentPage.value);
  } else {
    hideCommentsForPage(currentPage.value);
  }

  updateHighlightPositions(); // Update the comment markers
  updateOverlayPosition(); // Update the selection overlay

  lastScrollTop = container.scrollTop;
}

function showCommentsForPage(page) {
  // Logic to display comments for the given page
  // This could involve setting a state that controls the visibility of the comment markers
  filteredComments.value.forEach((comment) => {
    const commentElement = document.getElementById(`comment-${comment.id}`);
    if (commentElement) {
      commentElement.style.display = "block"; // Show comment
    }
  });
}

function hideCommentsForPage(page) {
  // Logic to hide comments for the given page
  filteredComments.value.forEach((comment) => {
    const commentElement = document.getElementById(`comment-${comment.id}`);
    if (commentElement) {
      commentElement.style.display = "none"; // Hide comment
    }
  });
}

function unhighlightComment(index) {
  const commentElement = document.getElementById(`comment-${index}`);
  if (commentElement) {
    commentElement.style.backgroundColor = "rgb(23, 127, 212, 0.1)"; // Original color
    commentElement.style.border = "none"; // Remove border
  }
}
const onMouseMove = (event) => {
  if (isDragging.value) {
    const deltaX = event.clientX - dragStartX.value;
    const deltaY = event.clientY - dragStartY.value;
    dialogTop.value = `${parseInt(dialogTop.value) + deltaY}px`;
    dialogLeft.value = `${parseInt(dialogLeft.value) + deltaX}px`;
    dragStartX.value = event.clientX;
    dragStartY.value = event.clientY;
  }
};

const onMouseUp = () => {
  isDragging.value = false;
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
};

const viewComment = (comment) => {
  // Handle viewing specific comment details
};

// Cleanup
onBeforeUnmount(() => {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
});
function updatePageNumber(newPage) {
  currentPage.value = newPage;
  loading.value = true;

  loadContent(newPage)
    .then(() => {
      loading.value = false;
    })
    .catch((error) => {
      console.error("Error loading content:", error);
      loading.value = false;
    });
}

function loadContent(pageNumber) {
  // Simulate content loading with a promise
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate a successful load after 1 second
      console.log(`Content for page ${pageNumber} loaded.`);
      resolve();
    }, 300);
  });
}

// Load comments from local storage
function loadComments() {
  const savedComments = localStorage.getItem("comments");
  // const commentsString = paperStore.paper.discussion
  if (savedComments) {
    comments.value = JSON.parse(savedComments);
  }
}

// Save comments to local storage
function saveComments() {
  localStorage.setItem("comments", JSON.stringify(comments.value));
}

// Filter comments for the current page
const filteredComments = computed(() =>
  comments.value.filter((comment) => comment.page === currentPage.value)
);

// Function to handle mouse down event to start selection
function startSelection(event) {
  const pdfImageElement = pdfImage.value.$el;
  const rect = pdfImageElement.getBoundingClientRect();
  selectionStart.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  selectionActive.value = true;
}

// Function to handle mouse move event to update selection
function handleMouseMove(event) {
  if (selectionActive.value) {
    const pdfImageElement = pdfImage.value.$el;
    const rect = pdfImageElement.getBoundingClientRect();
    selectionEnd.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
}

// Function to handle mouse up event to end selection
function endSelection() {
  selectionActive.value = false;
  openCommentDialog();
}

// Function to open the comment dialog
function openCommentDialog() {
  const pdfImageElement = pdfImage.value.$el;
  const rect = pdfImageElement.getBoundingClientRect();
  const containerWidth = rect.width;
  const x = Math.min(selectionStart.value.x, selectionEnd.value.x);
  const y = Math.min(selectionStart.value.y, selectionEnd.value.y);
  const width = Math.abs(selectionStart.value.x - selectionEnd.value.x);
  const height = Math.abs(selectionStart.value.y - selectionEnd.value.y);

  if (width / containerWidth > 0.25 && height <= 6 * 16) {
    // 6rem is equivalent to 6 * 16 pixels
    selectedArea.value = { x, y, width, height };
    dialogVisible.value = true;
  }
}

// Function to handle comment submission
function saveComment() {
  if (title.value && text.value && selectedArea.value) {
    const commentData = {
      title: title.value,
      text: text.value,
      coordinates: selectedArea.value,
      page: currentPage.value,
      timestamp: String(Date.now()),
      author: user.username, // Replace with dynamic user data
    };

    comments.value.push(commentData);
    saveComments();
    resetForm();
    dialogVisible.value = false;
  }
}

// Function to handle canceling the comment dialog
function cancelComment() {
  resetForm();
  dialogVisible.value = false;
}

// Function to reset the form and selection
function resetForm() {
  title.value = "";
  text.value = "";
  selectedArea.value = { x: null, y: null, width: null, height: null };
}

// Compute the style for the selection overlay
const overlayStyle = computed(() => {
  if (!selectionActive.value && !selectionEnd.value.x) return {};

  const x = Math.min(selectionStart.value.x, selectionEnd.value.x);
  const y = Math.min(selectionStart.value.y, selectionEnd.value.y);
  const width = Math.abs(selectionStart.value.x - selectionEnd.value.x);
  const height = Math.abs(selectionStart.value.y - selectionEnd.value.y);

  return {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: "rgba(0, 0, 255, 0.3)",
    border: "1px solid rgba(0, 0, 255, 0.5)",
    pointerEvents: "none",
  };
});

// Compute the style for comment markers
function commentStyle(commentData) {
  const pdfContainerElement = pdfContainer.value;
  const scrollTop = pdfContainerElement.scrollTop;
  const scrollLeft = pdfContainerElement.scrollLeft;

  const newTop = commentData.coordinates.y - scrollTop;
  const newLeft = commentData.coordinates.x - scrollLeft;

  return {
    position: "absolute",
    left: `${newLeft}px`,
    top: `${newTop}px`,
    width: `${commentData.coordinates.width}px`,
    height: `${commentData.coordinates.height}px`,
    backgroundColor: "rgb(23, 127, 212, 0.1)",
    padding: "4px",
    borderRadius: "4px",
    cursor: "pointer",
  };
}

function updateHighlightPositions() {
  // Updates positions of highlights based on scroll position
  filteredComments.value.forEach((commentData, index) => {
    const commentElement = document.querySelectorAll(`.comment-marker`)[index];
    if (commentElement) {
      const newStyle = commentStyle(commentData);
      Object.assign(commentElement.style, newStyle);
    }
  });
}

// Lifecycle hooks to manage event listeners
onMounted(() => {
  loadComments();
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", endSelection);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", endSelection);
});

const timeAgo = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (seconds < 60) {
    return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`;
  } else if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  } else if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  } else {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
};

const reactiveTimeAgo = (timestamp) => {
  return computed(() => timeAgo(timestamp));
};

// Example usage
const timestamp = Date.now() - 5 * 60 * 60 * 1000; // 5 hours ago
console.log(timeAgo(timestamp)); // Output: "5 hours ago"
</script>

<style scoped>
.loading-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 1000;
  text-align: center;
  padding: 1rem;
  font-size: 1.5rem;
  color: #333;
}

.selection-overlay {
  display: block;
  z-index: 1000;
}

.comment-marker {
  display: inline-block;
  z-index: 1000;
}
</style>
<style scoped>
.draggable-card {
  cursor: move;
}
</style>
<style scoped>
.scrollable-list-container {
  max-height: 400px; /* Adjust as needed */
  overflow-y: auto;
}
</style>
<style scoped>
#pdf-container {
  /* Ensures the container scrolls vertically */
  overflow-y: auto;
}

.selection-overlay {
  /* Style for the selection overlay */
  position: absolute;
  background-color: rgba(0, 0, 255, 0.3);
}

.comment-marker {
  /* Basic styling for the comment markers */
  position: absolute;
  cursor: pointer;
}

/* Additional styles as needed */
</style>
