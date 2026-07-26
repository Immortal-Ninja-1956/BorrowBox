import { useEffect } from "react";

export function usePageMetadata(title: string, description?: string) {
  useEffect(() => {
    // Update Title
    document.title = title ? `${title} | CampusCart` : "CampusCart - Peer-to-Peer Campus Marketplace";

    // Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head.appendChild(metaDescription);
    }
    
    const descContent = description || "CampusCart is a peer-to-peer campus marketplace for students to buy, sell, rent, or share items with in-person meetups and secure UPI payments.";
    metaDescription.setAttribute("content", descContent);
  }, [title, description]);
}
