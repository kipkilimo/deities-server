import { gql } from "apollo-server-express";

export const paymentTypeDefs = gql`
  type Payment {
    _id: ID!
    userId: User!
    paidAmount: String
    departmentId: String
    discussionGroupId: String
    transactionEntity: String
    paymentPhoneNumber: String
    transactionReferenceNumber: String
    paymentMethod: String
    createdAt: String!
  }

  type Mutation {
    # Mutation for waiving the access fee via WAIVER
    publicationCreditsPaymentViaWaiver(
      userId: String!
      discussionGroupId: String!
    ): Payment

    # Mutation for making access payment via MPESA
    publicationCreditsPaymentViaMpesa(
      userId: String!
      departmentId: String
      discussionGroupId: String
      paidAmount: String!
      transactionEntity: String
      paymentPhoneNumber: String!
      transactionReferenceNumber: String
      paymentMethod: String
      createdAt: String
    ): Payment

    # Mutation for making access payment via PayPal
    publicationCreditsPaymentViaPaypal(
      userId: String!
      paidAmount: String!
      departmentId: String
      discussionGroupId: String
      transactionEntity: String!
      paymentPhoneNumber: String
      transactionReferenceNumber: String
      paymentMethod: String
      createdAt: String
    ): Payment

    # Mutation for making access payment via MPESA
    processMpesaDonation(
      userId: String
      departmentId: String
      discussionGroupId: String
      paidAmount: String!
      transactionEntity: String
      paymentPhoneNumber: String!
      transactionReferenceNumber: String
      paymentMethod: String
      createdAt: String
    ): Payment
    # Mutation for making access payment via PayPal
    processPaypalDonation(
      userId: String
      paidAmount: String!
      departmentId: String
      discussionGroupId: String
      transactionEntity: String
      paymentPhoneNumber: String
      transactionReferenceNumber: String!
      paymentMethod: String
      createdAt: String
    ): Payment
  }

  type Query {
    getPayment(paymentId: ID!): Payment!
    getPayments: [Payment]
  }
`;

export default paymentTypeDefs;
