import { z } from "zod";
import prisma from "@/lib/prisma";
import { signAdminToken, setAdminCookie } from "@/lib/jwt";
import { verifyAdminPassword } from "@/lib/auth/admin-password";
import { error, success, serverError } from "@/lib/response";

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

    // Find admin by username
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return error("Invalid credentials", 401);
    }

    // Verify password
    const isPasswordValid = await verifyAdminPassword(
      password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      return error("Invalid credentials", 401);
    }

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
    return serverError(err);
  }
}
