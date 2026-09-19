import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    avatar: {
      type: String,
      trim: true,
      default: "",
    },
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: ["SUPER_ADMIN", "ADMIN", "STAFF", "CUSTOMER"],
      default: "CUSTOMER",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "BLOCKED"],
      default: "ACTIVE",
    },

    login_at: {
      type: Date,
      default: null,
    },

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
| PASSWORD HASH
|--------------------------------------------------------------------------
|
| Password is hashed only if password changes.
|
*/

userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }

    if (!this.password) {
      return next();
    }

    this.password = await bcrypt.hash(String(this.password), 12);

    next();
  } catch (error) {
    next(error);
  }
});

/*
|--------------------------------------------------------------------------
| PASSWORD COMPARE
|--------------------------------------------------------------------------
*/

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(String(candidatePassword), String(this.password));
};

userSchema.index({
  role: 1,
  status: 1,
});

const User = mongoose.model("User", userSchema);

export default User;
