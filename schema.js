import gql from "graphql-tag";

export const typeDefs = gql`
  scalar Date

  enum DeleteStatus {
    SUCCESS
    ERROR
  }

  type User {
    id: ID!
    name: String
    email: String
    role: String!
    createdAt: Date
    updatedAt: Date
  }

  type Room {
    id: ID!
    number: Int!
    type: String!
    pricePerNight: Float!
    amenities: [String!]!
    images: [String!]!
    isActive: Boolean!
    bookingCount: Int!
    ratings: [Review!]!
    averageRating: Float
    totalReviews: Int
  }

  type Booking {
    id: ID!
    user: User!
    room: Room!
    checkIn: Date!
    checkOut: Date!
    guests: Int!
    totalPrice: Float!
    status: String!
    createdAt: Date!
    review: Review
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
    role: String
  }

  type Image {
    url: String!
    altText: String
    caption: String
  }

  type Contact {
    id: ID!
    name: String!
    email: String!
    message: String!
    createdAt: Date!
    updatedAt: Date!
  }

  type Review {
    id: ID!
    user: User!
    rating: Int!
    comment: String!
    createdAt: String!
    updatedAt: String!
  }

  input ReviewInput {
    bookingId: ID!
    roomId: ID!
    rating: Int!
    comment: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input RoomInput {
    number: Int!
    type: String!
    pricePerNight: Float!
    amenities: [String!] = []
    images: [String!] = []
    isActive: Boolean!
  }

  input BookingInput {
    roomId: ID!
    checkIn: Date!
    checkOut: Date!
    guests: Int = 1
  }

  input ContactInput {
    name: String!
    email: String!
    message: String!
  }

  type DeletedRoomResponse {
    status: DeleteStatus!
    message: String!
    roomId: ID
  }

  input DeleteRoomInput {
    roomId: ID!
  }

  type Query {
    me: User
    rooms(activeOnly: Boolean = true): [Room!]!
    room(id: ID!): Room
    roomBookingCount(roomId: ID!): Int!
    myBookings: [Booking!]!
    bookings: [Booking!]! # admin
    getContacts: [Contact!]!
    getReviews(roomId: ID!): [Review!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    createRoom(input: RoomInput!): Room! # admin
    updateRoom(id: ID!, input: RoomInput!): Room! # admin
    toggleRoomActive(id: ID!, isActive: Boolean!): Room! # admin
    bookRoom(input: BookingInput!): Booking!
    cancelBooking(id: ID!): Booking!
    submitReview(input: ReviewInput!): Review!
    submitContact(input: ContactInput!): Contact!
    addReview(input: ReviewInput!): Review!
    deleteRoom(id: ID!): Room! # admin
  }
`;
