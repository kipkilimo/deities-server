import { IResolvers } from "@graphql-tools/utils";
import Department, { IDepartment } from "../models/Department"; // Ensure this is the correct model and interface
import User from "../models/User"; // Assuming User type is imported

// Utility function to find a department by its departmentId
const findDepartmentById = async (
  departmentId: string
): Promise<IDepartment | null> => {
  return await Department.findOne({ departmentId }).populate(
    "faculty programs students"
  );
};

const resolvers: IResolvers = {
  Query: {
    getDepartment: async (
      _parent,
      args: { departmentId: string }
    ): Promise<IDepartment | null> => {
      const department = await findDepartmentById(args.departmentId);
      if (!department) {
        throw new Error("Department not found");
      }
      return department;
    },
    getDepartments: async (): Promise<IDepartment[]> => {
      return await Department.find().populate("faculty programs students"); // Return all departments
    },
  },
  Mutation: {
    createDepartment: async (
      _parent,
      args: { departmentId: string; name: string }
    ): Promise<IDepartment> => {
      const existingDepartment = await findDepartmentById(args.departmentId);
      if (existingDepartment) {
        throw new Error("Department already exists");
      }

      const newDepartment = new Department({
        departmentId: args.departmentId,
        name: args.name,
        parent_institution: "", // Initialize as needed
        phone_number: "", // Initialize as needed
        email_address: "", // Initialize as needed
        faculty: [], // Initialize with an empty faculty array
        programs: [], // Initialize with an empty programs array
        students: [], // Initialize with an empty students array
      });

      await newDepartment.save(); // Save the new department to the database
      return newDepartment;
    },
    updateDepartment: async (
      _parent,
      args: { departmentId: string; name?: string }
    ): Promise<IDepartment | null> => {
      const department = await findDepartmentById(args.departmentId);
      if (!department) {
        throw new Error("Department not found");
      }

      if (args.name) {
        department.name = args.name; // Update the name if provided
        await department.save(); // Save the updated department
      }

      return department; // Return the updated department
    },
    deleteDepartment: async (
      _parent,
      args: { departmentId: string }
    ): Promise<IDepartment | null> => {
      const department = await Department.findOneAndDelete({
        departmentId: args.departmentId,
      });
      if (!department) {
        throw new Error("Department not found");
      }

      return department; // Return the deleted department
    },
  },
};

export default resolvers;
