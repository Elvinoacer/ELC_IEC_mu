import { z } from "zod";
import prisma from "@/lib/prisma";
import { signAdminToken, setAdminCookie } from "@/lib/jwt";
import { verifyAdminPassword } from "@/lib/auth/admin-password";
import { error, success, serverError } from "@/lib/response";
import { 
  checkLoginLockout, 
  logFailedLogin, 
  logSuccessfulLogin 
} from "@/lib/auth/admin-login-guard";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const { username, password } = result.data;
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(',')[0].trim() : null) || (req as any).ip || "unknown";

    // 1. Check for lockout
    const lockout = await checkLoginLockout(ip, username);
    if (lockout.locked) {
      return error(lockout.reason, 429);
    }

    // Find admin by username
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      await logFailedLogin(req, username, "User not found");
      return error("Invalid credentials", 401);
    }

    // Verify password
    const isPasswordValid = await verifyAdminPassword(
      password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      await logFailedLogin(req, username, "Invalid password");
      return error("Invalid credentials", 401);
    }

    // 2. Log successful login
    await logSuccessfulLogin(req, admin.id, username);

    // Generate JWT token
    const token = await signAdminToken(admin.id, admin.role);

    // Create success response
    const res = success({
      message: "Login successful",
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    });

    // Set HTTP-only admin session cookie
    res.headers.set("Set-Cookie", setAdminCookie(token));

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return serverError(err);
  }
}
