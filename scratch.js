{
  "department": {
    "departmentId": "string",
      "name": "string",
        "faculty": [User],
          "programs": [
            {
              "programId": "string",
              "name": "string",
              "degree": "string",
              "duration": "integer",
              "requiredCredits": "integer",
              "coursesOffered": [
                {
                  "courseId": "string",
                  "courseName": "string",
                  "courseCode": "string",
                  "credits": "integer"
                }
              ]
            }
          ],
            "students": [User]
  }
}
