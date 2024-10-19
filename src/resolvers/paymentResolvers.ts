import Payment from "../models/Payment";
import User from "../models/User";
import Department from "../models/Department";
import DiscussionGroup from "../models/DiscussionGroup";

import Mpesa from "mpesa-node";
import { DateTime } from "luxon";
// userTypes.ts
export interface PersonalInfo {
  publication_credits: number;
  // other properties DiscussionGroup
}

export interface User {
  _id: string; // or ObjectId if you're using mongoose
  personalInfo: PersonalInfo;
  // other properties
}
// Helper functions for generating random codes

import { generateUniqueCode } from "../utils/identifier_generator";
import generateAccessKey from "../utils/accessKeyUtility";
// function generateUniqueCode(12length: number = 12): string {
//   const characters =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   let result = characters.charAt(Math.floor(Math.random() * 52));
//   for (let i = 1; i < length; i++) {
//     result += characters.charAt(Math.floor(Math.random() * characters.length));
//   }
//   return result;
// }

function generatePartOneRandomCode(length: number): string {
  const characters = "ABDEFGHKLMNPQRTWXY";
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join("");
}

function generatePartTwoRandomCode(length: number): string {
  const characters = "234567823456782345678";
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join("");
}

// Define interfaces for payment data
interface PaymentValues {
  donatedAmount: string;
  transactionEntity_email_address: string;
  userId: string;
  paidAmount: string;
  accessDuration: string;
  paymentPhoneNumber: string;
  transaction_reference_number: string;
  phone_number: string;
  email: string;
  transactionEntity: string;
  productId: string;
  amount: string;
  advertsAmount: string;
  advert_target_region: string;
  advert_action_url: string;
  adverts_reference: string;
}

interface Context {
  // Define any relevant properties for context if needed
}

const calculateCredits = (usdValue: number): number => {
  const creditsPerDollar = 100; // 1 USD gives 100 points
  return Math.ceil(usdValue * creditsPerDollar); // Round up to the nearest whole number
};

const resolvers = {
  Mutation: {
    // Resolver for waiving access fees
    publicationCreditsPaymentViaWaiver: async (
      _parent: any,
      args: {
        userId: string;
        discussionGroupId: string; // Optional
      }
    ) => {
      try {
        const receiptNumber = generateUniqueCode(12).toUpperCase();
        const currentDate = new Date();

        // Search for the payment by discussionGroupId
        const paymentCheck = await Payment.findOne({
          discussionGroupId: args.discussionGroupId,
        });

        // Check if payment exists
        if (paymentCheck) {
          // Calculate the difference in time (in milliseconds) between the current date and the payment's createdAt date
          const paymentDate = new Date(paymentCheck.createdAt);
          const oneYearInMilliseconds = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

          // Compare the payment date with the current date to see if it's less than 1 year old
          // @ts-ignore
          if (currentDate - paymentDate < oneYearInMilliseconds) {
            throw new Error("Waiver already granted within the last year.");
          }
        }

        const payment = new Payment({
          userId: args.userId,
          paidAmount: "0",
          discussionGroupId: args.discussionGroupId,
          transactionEntity: "DISCUSSION_GROUP",
          transactionReferenceNumber: receiptNumber,
          paymentMethod: "WAIVER",
          createdAt: DateTime.now().toISO(),
        });

        const currentdiscussionGroup = await DiscussionGroup.findOne({
          discussionGroupId: args.discussionGroupId,
        })
          .populate({
            path: "members",
            model: "User",
            select: {
              id: 1,
              personalInfo: {
                username: 1,
                fullName: 1,
                email: 1,
                scholarId: 1,
                activationToken: 1,
                publication_credits: 1,
                resetToken: 1,
                tokenExpiry: 1,
                activatedAccount: 1,
              },
              role: 1,
            },
          })
          .exec();

        const discussionGroupMembers = currentdiscussionGroup?.members || [];

        const updatePromises = discussionGroupMembers.map(async (member) => {
          const publicationCredits =
            // @ts-ignore
            Number(member.personalInfo.publication_credits);
          const updatedCredits = publicationCredits + 100;

          return User.findByIdAndUpdate(member.id, {
            $set: {
              "personalInfo.publication_credits": updatedCredits,
            },
          });
        });

        try {
          await Promise.all(updatePromises);
        } catch (error) {
          console.error(
            "Error updating faculty members' publication credits:",
            error
          );
          // Handle error as needed (e.g., throw new Error or log)
        }
        return await payment.save();
      } catch (error) {
        throw new Error(`Failed to waive access fee: ${error}`);
      }
    },

    // Resolver for making an MPESA payment
    publicationCreditsPaymentViaMpesa: async (
      _: unknown,
      args: {
        userId: string;
        transactionEntity: string;
        paymentPhoneNumber: string;
        paidAmount: string;
        departmentId: string;
        discussionGroupId: string;
      },
      context: Context
    ): Promise<Payment> => {
      try {
        console.log({
          userId: args.userId,
          departmentId: args.departmentId,
          transactionEntity: args.transactionEntity,
          paidAmount: args.paidAmount,
          paymentPhoneNumber: args.paymentPhoneNumber,
        });
        const activatingUser = await User.findById(args.userId);
        if (!activatingUser) {
          throw new Error("No teacher matching provided details");
        }

        const publisherName = `${activatingUser.personalInfo.fullName}`;
        const paymentAccount = `${publisherName} NEMBio Publication Credits`;
        const paidAmount = Number(args.paidAmount);
        const paymentNumber = args.paymentPhoneNumber;
        const dollarRate = Number(process.env.DOLLAR_RATE) || 1; // Fallback to 1 if undefined

        const usdValue = paidAmount * dollarRate;
        const totalPurchasedCredits = calculateCredits(usdValue);

        // MPESA action START
        const mpesaApi = new Mpesa({
          consumerKey: process.env.MPESA_CONSUMER_KEY!,
          consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
          //@ts-ignore
          environment: "production",
          shortCode: "4073131",
          initiatorName: "County Square",
          lipaNaMpesaShortCode: "4073131",
          lipaNaMpesaShortPass: process.env.MPESA_PAYMENT_PASSKEY!,
          securityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
        });

        const paymentObjectBody = await mpesaApi.lipaNaMpesaOnline(
          paymentNumber,
          paidAmount,
          "https://countysquare.co.ke/success",
          paymentAccount
        );

        const delayedLogic = async (): Promise<Payment> => {
          await new Promise((resolve) => setTimeout(resolve, 18000)); // Wait for 18 seconds
          const paymentResponse = await mpesaApi.lipaNaMpesaQuery(
            paymentObjectBody.data.CheckoutRequestID
          );

          if (paymentResponse.data.ResultCode !== "0") {
            throw new Error("Payment did not complete successfully.");
          }

          const receiptNumber = generateUniqueCode(12).toUpperCase();
          const newPayment = new Payment({
            userId: args.userId,
            paidAmount: paidAmount,
            departmentId: args.departmentId,
            discussionGroupId: args.discussionGroupId,
            transactionEntity: args.transactionEntity,
            paymentPhoneNumber: args.paymentPhoneNumber,
            transactionReferenceNumber: receiptNumber,
            paymentMethod: "MPESA",
            createdAt: DateTime.now().toISO(),
          });

          return await newPayment.save();
        };

        const result = await delayedLogic();

        // Update user's publication_credits_added
        if (args.transactionEntity === "INDIVIDUAL") {
          const publication_credits_added =
            Number(activatingUser.personalInfo.publication_credits) +
            totalPurchasedCredits;

          await User.findByIdAndUpdate(activatingUser.id, {
            $set: {
              publication_credits: publication_credits_added,
            },
          });
        }
        if (args.transactionEntity === "DEPARTMENT") {
          const currentDepartment = await Department.findOne({
            departmentId: args.departmentId,
          })
            .populate({
              path: "faculty",
              model: "User",
              select: {
                id: 1,
                personalInfo: {
                  username: 1,
                  fullName: 1,
                  email: 1,
                  scholarId: 1,
                  activationToken: 1,
                  publication_credits: 1,
                  resetToken: 1,
                  tokenExpiry: 1,
                  activatedAccount: 1,
                },
                role: 1,
              },
            })
            .exec();

          const facultyMembers = currentDepartment?.faculty || [];

          const updatePromises = facultyMembers.map(async (member) => {
            const publicationCredits =
              // @ts-ignore
              Number(member.personalInfo.publication_credits);
            const updatedCredits = publicationCredits + totalPurchasedCredits;

            return User.findByIdAndUpdate(member.id, {
              $set: {
                publication_credits: updatedCredits,
              },
            });
          });

          try {
            await Promise.all(updatePromises);
          } catch (error) {
            console.error(
              "Error updating faculty members' publication credits:",
              error
            );
            // Handle error as needed (e.g., throw new Error or log)
          }
        }

        return result;
      } catch (error) {
        throw new Error(
          `Payment process did not complete successfully: ${error}`
        );
      }
    },

    // Resolver for PayPal payment
    publicationCreditsPaymentViaPaypal: async (
      _: unknown,
      args: {
        userId: string;
        transactionEntity: string;
        paymentPhoneNumber: string;
        paidAmount: string;
        departmentId: string;
        discussionGroupId: string;
      }
    ): Promise<Payment> => {
      try {
        console.log({
          userId: args.userId,
          departmentId: args.departmentId,
          transactionEntity: args.transactionEntity,
          paidAmount: args.paidAmount,
          transactionReferenceNumber: "MOCK_PAYPAL",
        });
        const usdValue = Number(args.paidAmount);
        const totalPurchasedCredits = calculateCredits(usdValue);

        const activatingUser = await User.findById(args.userId);
        if (!activatingUser) {
          throw new Error("No user found with the provided details");
        }

        const receiptNumber = generateUniqueCode(12).toUpperCase();
        const newPayment = new Payment({
          userId: args.userId,
          paidAmount: args.paidAmount,
          departmentId: args.departmentId,
          discussionGroupId: args.discussionGroupId,
          transactionEntity: args.transactionEntity,
          paymentPhoneNumber: args.paymentPhoneNumber,
          transactionReferenceNumber: receiptNumber,
          paymentMethod: "PAYPAL",
          createdAt: DateTime.now().toISO(),
        });

        const result = await newPayment.save();

        console.log({ totalPurchasedCredits: totalPurchasedCredits });

        // Update publication credits based on transactionEntity type
        // Update publication credits based on transactionEntity type
        if (args.transactionEntity === "INDIVIDUAL") {
          const publicationCreditsAdded =
            Number(activatingUser.personalInfo.publication_credits) +
            totalPurchasedCredits;

          await User.findByIdAndUpdate(activatingUser.id, {
            $set: {
              "personalInfo.publication_credits": publicationCreditsAdded,
            }, // Inner field update
          });
        }

        // Update faculty members' publication credits if transactionEntity is DEPARTMENT
        if (args.transactionEntity === "DEPARTMENT") {
          try {
            const currentDepartment = await Department.findOne({
              departmentId: args.departmentId,
            })
              .populate({
                path: "members",
                model: "User",
                select: {
                  id: 1,
                  personalInfo: {
                    username: 1,
                    fullName: 1,
                    email: 1,
                    scholarId: 1,
                    activationToken: 1,
                    publication_credits: 1,
                    resetToken: 1,
                    tokenExpiry: 1,
                    activatedAccount: 1,
                  },
                  role: 1,
                },
              })
              .exec();
            const facultyMembers = currentDepartment?.faculty || [];

            // Update publication credits for each faculty member concurrently
            const updatePromises = facultyMembers.map((member) => {
              const publicationCredits = Number(
                //@ts-ignore
                member.personalInfo?.publication_credits
              ); // Optional chaining
              const updatedCredits = publicationCredits + totalPurchasedCredits;

              return User.findByIdAndUpdate(member.id, {
                $set: { "personalInfo.publication_credits": updatedCredits }, // Inner field update
              });
            });

            await Promise.all(updatePromises);
          } catch (error) {
            console.error(
              "Error updating faculty members' publication credits:",
              error
            );
            // Handle error as needed (e.g., throw or log further)
          }
        }

        return result;
      } catch (error) {
        throw new Error(
          `Payment process did not complete successfully: ${error}`
        );
      }
    },
  },

  Query: {
    // Query to get a specific payment by ID
    getPayment: async (_parent: any, { paymentId }: any) => {
      try {
        return await Payment.findById(paymentId);
      } catch (error) {
        throw new Error(`Payment not found: ${error}`);
      }
    },

    // Query to get all payments
    getPayments: async () => {
      try {
        return await Payment.find();
      } catch (error) {
        throw new Error(`Failed to retrieve payments: ${error}`);
      }
    },
  },
};

export default resolvers;
