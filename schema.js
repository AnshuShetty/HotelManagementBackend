import gql from "graphql-tag";

export const typeDefs = gql`
  scalar Date

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

  type Review {
    id: ID!
    rating: Int!
    comment: String!
  }

  input ReviewInput {
    bookingId: ID!
    rating: Int!
    comment: String!
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

  type Query {
    me: User
    rooms(activeOnly: Boolean = true): [Room!]!
    room(id: ID!): Room
    roomBookingCount(roomId: ID!): Int!
    myBookings: [Booking!]!
    bookings: [Booking!]! # admin
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
  }
`;
