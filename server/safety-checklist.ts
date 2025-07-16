import { db } from "./db";
import { safetyChecklists } from "@shared/schema";
import { sendAdminEmailNotification } from "./sendgrid-email";
import { sendTMobileNotification } from "./email-sms";

interface SafetyChecklistData {
  driverId: number;
  gasLevel: string;
  visualInspection: string;
  date: string;
  businessId?: number;
}

export async function createSafetyChecklist(data: SafetyChecklistData) {
  // Save checklist to database
  const [checklist] = await db
    .insert(safetyChecklists)
    .values({
      businessId: data.businessId || 1, // Default to business ID 1
      driverId: data.driverId,
      gasLevel: data.gasLevel,
      visualInspection: data.visualInspection,
      date: data.date,
      createdAt: new Date(),
    })
    .returning();

  // Check for alert conditions and send notifications
  const alerts = [];
  
  // Check for low gas level (1/4)
  if (data.gasLevel === "1/4") {
    alerts.push("Low Gas Level");
    
    // Send email notification to admins
    await sendAdminEmailNotification(
      "Low Gas Alert - Van Needs Fuel",
      `Driver has reported low gas level (1/4 tank). Van needs refueling before next route.
      
Driver ID: ${data.driverId}
Gas Level: ${data.gasLevel}
Date: ${data.date}
Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}

Please arrange for immediate refueling.`,
      "high"
    );

    // Send SMS backup notification
    await sendTMobileNotification(
      "Low Gas Alert",
      `Van needs fuel - Driver reported 1/4 tank. Arrange immediate refueling.`,
      "high"
    );
  }

  // Check for failed visual inspection
  if (data.visualInspection === "No") {
    alerts.push("Failed Visual Inspection");
    
    // Send email notification to admins
    await sendAdminEmailNotification(
      "Failed Vehicle Inspection Alert",
      `Driver has reported that the van failed visual inspection and may not be safe to drive.
      
Driver ID: ${data.driverId}
Visual Inspection: ${data.visualInspection}
Date: ${data.date}
Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}

Please inspect the vehicle immediately before allowing route to proceed.`,
      "urgent"
    );

    // Send SMS backup notification
    await sendTMobileNotification(
      "Vehicle Inspection Failed",
      `URGENT: Van failed safety inspection. Driver reports van not safe to drive. Inspect immediately.`,
      "urgent"
    );
  }

  return {
    checklist,
    alerts
  };
}