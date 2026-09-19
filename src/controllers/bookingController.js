import ServiceBooking from "../models/ServiceBooking.js";
import User from "../models/User.js";
import Service from "../models/Service.js";

/*
|--------------------------------------------------------------------------
| POPULATE FIELDS
|--------------------------------------------------------------------------
*/

const CUSTOMER_FIELDS = [
  "firstName",
  "lastName",
  "username",
  "email",
  "phone",
  "role",
  "status",
].join(" ");

const SERVICE_FIELDS = ["name", "price", "thumbnail", "images", "status"].join(
  " ",
);

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| GET USER ID
|--------------------------------------------------------------------------
*/

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

/*
|--------------------------------------------------------------------------
| CLEAN STRING
|--------------------------------------------------------------------------
*/

function cleanString(value) {
  return String(value ?? "").trim();
}

/*
|--------------------------------------------------------------------------
| CUSTOMER NAME
|--------------------------------------------------------------------------
*/

function getCustomerName(customer) {
  if (!customer) {
    return "";
  }

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || customer.username || "";
}

/*
|--------------------------------------------------------------------------
| DESCRIPTION OBJECT
|--------------------------------------------------------------------------
*/

function getDescription(booking) {
  if (
    booking?.description &&
    typeof booking.description === "object" &&
    !Array.isArray(booking.description)
  ) {
    return {
      ...booking.description,
    };
  }

  return {};
}

/*
|--------------------------------------------------------------------------
| POPULATE ONE BOOKING
|--------------------------------------------------------------------------
*/

async function populateBooking(bookingId) {
  return ServiceBooking.findById(bookingId)
    .populate("customer_id", CUSTOMER_FIELDS)
    .populate("products_id", SERVICE_FIELDS);
}

/*
|--------------------------------------------------------------------------
| GET BOOKINGS
|--------------------------------------------------------------------------
*/

export async function getBookings(req, res, next) {
  try {
    const bookings = await ServiceBooking.find()
      .populate("customer_id", CUSTOMER_FIELDS)
      .populate("products_id", SERVICE_FIELDS)
      .sort({
        created_at: -1,
        _id: -1,
      });

    return res.status(200).json({
      bookings,
    });
  } catch (error) {
    console.error("[GET BOOKINGS ERROR]", error);

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| GET MY BOOKINGS
|--------------------------------------------------------------------------
*/

export async function getMyBookings(req, res, next) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const bookings = await ServiceBooking.find({
      customer_id: userId,
    })
      .populate("customer_id", CUSTOMER_FIELDS)
      .populate("products_id", SERVICE_FIELDS)
      .sort({
        created_at: -1,
        _id: -1,
      });

    return res.status(200).json({
      bookings,
    });
  } catch (error) {
    console.error("[GET MY BOOKINGS ERROR]", error);

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| GET BOOKING BY ID
|--------------------------------------------------------------------------
*/

export async function getBookingById(req, res, next) {
  try {
    const booking = await populateBooking(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    return res.status(200).json({
      booking,
    });
  } catch (error) {
    console.error("[GET BOOKING ERROR]", error);

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| CREATE BOOKING
|--------------------------------------------------------------------------
*/

export async function createBooking(req, res, next) {
  try {
    /*
    |--------------------------------------------------------------------------
    | CUSTOMER
    |--------------------------------------------------------------------------
    */

    const authenticatedUserId = getUserId(req);

    const customerId = req.body?.customer_id || authenticatedUserId;

    if (!customerId) {
      return res.status(400).json({
        message: "Customer is required.",
      });
    }

    const customer = await User.findById(customerId).select(CUSTOMER_FIELDS);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PRODUCTS / SERVICES
    |--------------------------------------------------------------------------
    */

    const productsId = Array.isArray(req.body?.products_id)
      ? req.body.products_id.filter(Boolean)
      : [];

    if (!productsId.length) {
      return res.status(400).json({
        message: "At least one service is required.",
      });
    }

    /*
     * Make sure every requested ID
     * actually exists.
     */

    const services = await Service.find({
      _id: {
        $in: productsId,
      },
    }).select("_id name price status");

    if (services.length !== productsId.length) {
      return res.status(400).json({
        message: "One or more selected services could not be found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | TOTAL PRICE
    |--------------------------------------------------------------------------
    */

    const totalPrice = services.reduce(
      (total, service) => total + Number(service.price || 0),
      0,
    );

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER SNAPSHOT
    |--------------------------------------------------------------------------
    |
    | This is important.
    |
    | Even if the user later changes phone/email,
    | the booking keeps the contact information
    | used at booking time.
    |
    */

    const customerName = getCustomerName(customer);

    const customerEmail = cleanString(customer.email);

    const customerPhone = cleanString(customer.phone);

    /*
    |--------------------------------------------------------------------------
    | DESCRIPTION
    |--------------------------------------------------------------------------
    */

    const incomingDescription =
      req.body?.description &&
      typeof req.body.description === "object" &&
      !Array.isArray(req.body.description)
        ? req.body.description
        : {};

    let bookingChannel = cleanString(
      incomingDescription.booking_channel,
    ).toUpperCase();

    /*
     * Only allow the channels
     * currently supported by
     * your customer booking flow.
     */

    if (!["WHATSAPP", "EMAIL"].includes(bookingChannel)) {
      bookingChannel = "";
    }

    const people = Math.max(1, Number(incomingDescription.people || 1));

    const description = {
      ...incomingDescription,

      booking_date: cleanString(incomingDescription.booking_date),

      booking_time: cleanString(incomingDescription.booking_time),

      people,

      note: cleanString(incomingDescription.note),

      contact_message: cleanString(incomingDescription.contact_message),

      booking_channel: bookingChannel,

      /*
       * Contact snapshot
       */

      customer_name: customerName,

      customer_email: customerEmail,

      customer_phone: customerPhone,
    };

    /*
    |--------------------------------------------------------------------------
    | PAYMENT
    |--------------------------------------------------------------------------
    */

    const paidType = req.body?.paid_type === "BANK" ? "BANK" : "CASH";

    const paymentMethod =
      paidType === "BANK" ? "BANK_TRANSFER" : "PAY_AT_CHECK_IN";

    /*
     * If frontend sends a valid
     * payment method, allow it.
     */

    const requestedPaymentMethod = cleanString(req.body?.payment_method);

    const finalPaymentMethod = ["BANK_TRANSFER", "PAY_AT_CHECK_IN"].includes(
      requestedPaymentMethod,
    )
      ? requestedPaymentMethod
      : paymentMethod;

    /*
    |--------------------------------------------------------------------------
    | CREATE
    |--------------------------------------------------------------------------
    */

    const booking = await ServiceBooking.create({
      customer_id: customer._id,

      products_id: productsId,

      paid_type: paidType,

      payment_method: finalPaymentMethod,

      total_price: totalPrice,

      status: "PENDING",

      description,
    });

    /*
    |--------------------------------------------------------------------------
    | POPULATE
    |--------------------------------------------------------------------------
    */

    const populatedBooking = await populateBooking(booking._id);

    /*
    |--------------------------------------------------------------------------
    | SOCKET
    |--------------------------------------------------------------------------
    */

    req.io?.emit("booking:new", populatedBooking);

    return res.status(201).json({
      message: "Booking created successfully.",

      booking: populatedBooking,
    });
  } catch (error) {
    console.error("[CREATE BOOKING ERROR]", error);

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE BOOKING
|--------------------------------------------------------------------------
*/

export async function updateBooking(req, res, next) {
  try {
    const booking = await ServiceBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER
    |--------------------------------------------------------------------------
    */

    if (req.body?.customer_id) {
      const customer = await User.findById(req.body.customer_id).select(
        CUSTOMER_FIELDS,
      );

      if (!customer) {
        return res.status(404).json({
          message: "Customer not found.",
        });
      }

      booking.customer_id = customer._id;

      /*
       * Update contact snapshot
       * when admin changes customer.
       */

      const description = getDescription(booking);

      booking.description = {
        ...description,

        customer_name: getCustomerName(customer),

        customer_email: cleanString(customer.email),

        customer_phone: cleanString(customer.phone),
      };

      booking.markModified("description");
    }

    /*
    |--------------------------------------------------------------------------
    | SERVICES
    |--------------------------------------------------------------------------
    */

    if (Array.isArray(req.body?.products_id)) {
      const productsId = req.body.products_id.filter(Boolean);

      if (!productsId.length) {
        return res.status(400).json({
          message: "At least one service is required.",
        });
      }

      const services = await Service.find({
        _id: {
          $in: productsId,
        },
      }).select("_id price");

      if (services.length !== productsId.length) {
        return res.status(400).json({
          message: "One or more selected services could not be found.",
        });
      }

      booking.products_id = productsId;

      booking.total_price = services.reduce(
        (total, service) => total + Number(service.price || 0),
        0,
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT
    |--------------------------------------------------------------------------
    */

    if (req.body?.paid_type) {
      booking.paid_type = req.body.paid_type === "BANK" ? "BANK" : "CASH";
    }

    if (req.body?.payment_method) {
      const method = cleanString(req.body.payment_method);

      if (["PAY_AT_CHECK_IN", "BANK_TRANSFER"].includes(method)) {
        booking.payment_method = method;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    if (req.body?.status) {
      const status = cleanString(req.body.status).toUpperCase();

      if (["PENDING", "ACCEPT", "REJECT"].includes(status)) {
        booking.status = status;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | DESCRIPTION
    |--------------------------------------------------------------------------
    */

    if (
      req.body?.description &&
      typeof req.body.description === "object" &&
      !Array.isArray(req.body.description)
    ) {
      const currentDescription = getDescription(booking);

      const incoming = req.body.description;

      const nextDescription = {
        ...currentDescription,

        ...incoming,
      };

      if ("booking_date" in incoming) {
        nextDescription.booking_date = cleanString(incoming.booking_date);
      }

      if ("booking_time" in incoming) {
        nextDescription.booking_time = cleanString(incoming.booking_time);
      }

      if ("people" in incoming) {
        nextDescription.people = Math.max(1, Number(incoming.people || 1));
      }

      if ("note" in incoming) {
        nextDescription.note = cleanString(incoming.note);
      }

      if ("contact_message" in incoming) {
        nextDescription.contact_message = cleanString(incoming.contact_message);
      }

      if ("booking_channel" in incoming) {
        const channel = cleanString(incoming.booking_channel).toUpperCase();

        nextDescription.booking_channel = ["WHATSAPP", "EMAIL"].includes(
          channel,
        )
          ? channel
          : currentDescription.booking_channel || "";
      }

      /*
       * Do not delete customer
       * contact snapshots accidentally.
       */

      nextDescription.customer_name =
        nextDescription.customer_name || currentDescription.customer_name || "";

      nextDescription.customer_email =
        nextDescription.customer_email ||
        currentDescription.customer_email ||
        "";

      nextDescription.customer_phone =
        nextDescription.customer_phone ||
        currentDescription.customer_phone ||
        "";

      booking.description = nextDescription;

      booking.markModified("description");
    }

    await booking.save();

    const populatedBooking = await populateBooking(booking._id);

    req.io?.emit("booking:updated", populatedBooking);

    return res.status(200).json({
      message: "Booking updated successfully.",

      booking: populatedBooking,
    });
  } catch (error) {
    console.error("[UPDATE BOOKING ERROR]", error);

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| ACCEPT BOOKING
|--------------------------------------------------------------------------
*/

export async function acceptBooking(req, res, next) {
  try {
    const booking = await ServiceBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    booking.status = "ACCEPT";

    await booking.save();

    const populatedBooking = await populateBooking(booking._id);

    req.io?.emit("booking:updated", populatedBooking);

    return res.status(200).json({
      message: "Booking accepted successfully.",

      booking: populatedBooking,
    });
  } catch (error) {
    console.error("[ACCEPT BOOKING ERROR]", error);

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| REJECT BOOKING
|--------------------------------------------------------------------------
*/

export async function rejectBooking(req, res, next) {
  try {
    const booking = await ServiceBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    const reason = cleanString(req.body?.reason);

    /*
    |--------------------------------------------------------------------------
    | GET CURRENT CUSTOMER
    |--------------------------------------------------------------------------
    |
    | This is especially useful for old bookings
    | that were created before customer_phone
    | and customer_email snapshots were introduced.
    |
    */

    const customer = booking.customer_id
      ? await User.findById(booking.customer_id).select(CUSTOMER_FIELDS)
      : null;

    /*
    |--------------------------------------------------------------------------
    | DESCRIPTION
    |--------------------------------------------------------------------------
    */

    const currentDescription = getDescription(booking);

    /*
     * Existing snapshot has priority.
     * Current user data fills missing fields.
     */

    const customerName =
      currentDescription.customer_name || getCustomerName(customer) || "";

    const customerEmail =
      currentDescription.customer_email || cleanString(customer?.email);

    const customerPhone =
      currentDescription.customer_phone || cleanString(customer?.phone);

    booking.description = {
      ...currentDescription,

      reject_reason: reason,

      customer_name: customerName,

      customer_email: customerEmail,

      customer_phone: customerPhone,

      rejected_at: new Date(),
    };

    booking.markModified("description");

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    |
    | Missing customer phone/email does NOT
    | prevent the booking from being rejected.
    |
    */

    booking.status = "REJECT";

    await booking.save();

    /*
    |--------------------------------------------------------------------------
    | POPULATE
    |--------------------------------------------------------------------------
    */

    const populatedBooking = await populateBooking(booking._id);

    /*
    |--------------------------------------------------------------------------
    | SOCKET
    |--------------------------------------------------------------------------
    */

    req.io?.emit("booking:updated", populatedBooking);

    return res.status(200).json({
      message: "Booking rejected successfully.",

      booking: populatedBooking,

      /*
       * Useful for admin frontend.
       */

      notification: {
        channel: populatedBooking?.description?.booking_channel || "",

        customer_email:
          populatedBooking?.description?.customer_email ||
          populatedBooking?.customer_id?.email ||
          "",

        customer_phone:
          populatedBooking?.description?.customer_phone ||
          populatedBooking?.customer_id?.phone ||
          "",

        can_email: Boolean(
          populatedBooking?.description?.customer_email ||
          populatedBooking?.customer_id?.email,
        ),

        can_whatsapp: Boolean(
          populatedBooking?.description?.customer_phone ||
          populatedBooking?.customer_id?.phone,
        ),
      },
    });
  } catch (error) {
    console.error("[REJECT BOOKING ERROR]", error);

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| DELETE BOOKING
|--------------------------------------------------------------------------
*/

export async function deleteBooking(req, res, next) {
  try {
    const booking = await ServiceBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    await booking.deleteOne();

    req.io?.emit("booking:deleted", {
      _id: booking._id,
    });

    return res.status(200).json({
      message: "Booking deleted successfully.",
    });
  } catch (error) {
    console.error("[DELETE BOOKING ERROR]", error);

    next(error);
  }
}
