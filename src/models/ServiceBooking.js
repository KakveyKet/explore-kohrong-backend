import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| BOOKED SERVICE SNAPSHOT
|--------------------------------------------------------------------------
|
| This stores the service information at booking time.
|
| Example:
|
| Service today:
| Boat Trip = $25
|
| Customer books:
| price = $25
|
| Later admin changes service to $30.
|
| Old booking still keeps:
| price = $25
|
*/

const bookedServiceSchema = new mongoose.Schema(
  {
    service_id: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Service",

      required: true,
    },

    name: {
      type: String,

      required: true,

      trim: true,
    },

    price: {
      type: Number,

      required: true,

      min: 0,
    },

    quantity: {
      type: Number,

      default: 1,

      min: 1,
    },

    subtotal: {
      type: Number,

      required: true,

      min: 0,
    },
  },

  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| BOOKING SCHEMA
|--------------------------------------------------------------------------
*/

const serviceBookingSchema = new mongoose.Schema(
  {
    /*
      |--------------------------------------------------------------------------
      | LEGACY / CURRENT SERVICE IDS
      |--------------------------------------------------------------------------
      |
      | KEEP THIS FIELD.
      |
      | Your existing controllers and frontend already use:
      |
      | products_id
      |
      | This prevents:
      |
      | StrictPopulateError:
      | Cannot populate path products_id
      |
      */

    products_id: [
      {
        type: mongoose.Schema.Types.ObjectId,

        ref: "Service",
      },
    ],

    /*
      |--------------------------------------------------------------------------
      | PRICE SNAPSHOT
      |--------------------------------------------------------------------------
      |
      | New booking snapshot.
      |
      | Reports should eventually use this.
      |
      */

    products: {
      type: [bookedServiceSchema],

      default: [],
    },

    /*
      |--------------------------------------------------------------------------
      | CUSTOMER
      |--------------------------------------------------------------------------
      */

    customer_id: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,
    },

    /*
      |--------------------------------------------------------------------------
      | TOTAL
      |--------------------------------------------------------------------------
      |
      | This is the booking total.
      |
      | We are NOT using this for
      | revenue reporting.
      |
      */

    total_price: {
      type: Number,

      default: 0,

      min: 0,
    },

    /*
      |--------------------------------------------------------------------------
      | BOOKING DETAIL
      |--------------------------------------------------------------------------
      */

    description: {
      booking_date: {
        type: Date,

        required: true,
      },

      booking_time: {
        type: String,

        default: "",
      },

      people: {
        type: Number,

        default: 1,

        min: 1,
      },

      note: {
        type: String,

        trim: true,

        default: "",
      },

      booking_channel: {
        type: String,

        trim: true,

        default: "",
      },

      contact_message: {
        type: String,

        trim: true,

        default: "",
      },
    },

    /*
      |--------------------------------------------------------------------------
      | STATUS
      |--------------------------------------------------------------------------
      */

    status: {
      type: String,

      enum: ["PENDING", "ACCEPT", "REJECT"],

      default: "PENDING",
    },

    /*
      |--------------------------------------------------------------------------
      | PAYMENT TYPE
      |--------------------------------------------------------------------------
      */

    paid_type: {
      type: String,

      enum: ["CASH", "BANK"],

      default: "CASH",
    },

    /*
      |--------------------------------------------------------------------------
      | PAYMENT METHOD
      |--------------------------------------------------------------------------
      */

    payment_method: {
      type: String,

      enum: ["PAY_AT_CHECK_IN", "BANK_TRANSFER"],

      default: "PAY_AT_CHECK_IN",
    },

    /*
      |--------------------------------------------------------------------------
      | AUDIT
      |--------------------------------------------------------------------------
      */

    created_by: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      default: null,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      default: null,
    },
  },

  {
    timestamps: {
      createdAt: "created_at",

      updatedAt: "updated_at",
    },
  },
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

serviceBookingSchema.index({
  customer_id: 1,

  created_at: -1,
});

serviceBookingSchema.index({
  status: 1,

  created_at: -1,
});

serviceBookingSchema.index({
  products_id: 1,
});

serviceBookingSchema.index({
  "products.service_id": 1,
});

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

const ServiceBooking = mongoose.model("ServiceBooking", serviceBookingSchema);

export default ServiceBooking;
