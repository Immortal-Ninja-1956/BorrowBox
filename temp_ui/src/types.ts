/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  type: 'borrow' | 'buy';
  price: number; // per day for borrow, total for buy
  condition: 'New' | 'Like New' | 'Good' | 'Fair';
  imageUrl: string;
  available: boolean;
  location: string;
  rating: number;
  reviewsCount: number;
}

export interface Booking {
  id: string;
  itemId: string;
  itemTitle: string;
  itemType: 'borrow' | 'buy';
  itemPrice: number;
  imageUrl: string;
  ownerId: string;
  ownerName: string;
  borrowerId: string;
  borrowerName: string;
  startDate?: string;
  endDate?: string;
  totalCost: number;
  status: 'requested' | 'active' | 'completed' | 'cancelled' | 'returned';
  paymentStatus: 'held_in_escrow' | 'released' | 'refunded';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  balance: number;
  reputation: number;
}

export interface PresetItem {
  title: string;
  category: string;
  description: string;
  price: number;
  type: 'borrow' | 'buy';
  imageUrl: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair';
}
