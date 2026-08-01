"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Button, Card, Input, Stack, Text } from "@chakra-ui/react";

import { Field } from "~/components/ui/field";
import { NumericInput } from "~/components/ui/numeric-input";
import { authClient } from "~/server/better-auth/client";

export function LoginForm() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await authClient.signIn.phoneNumber({
      phoneNumber,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError("Số điện thoại hoặc mật khẩu không đúng.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <Card.Root w="full" maxW="sm">
      <Card.Header>
        <Card.Title>Đăng nhập</Card.Title>
        <Card.Description>
          Nhập số điện thoại và mật khẩu để tiếp tục.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Stack asChild gap={4}>
          <form onSubmit={handleSubmit}>
            <Field label="Số điện thoại">
              <NumericInput
                id="phoneNumber"
                autoComplete="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </Field>
            <Field label="Mật khẩu">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error ? (
              <Text fontSize="sm" color="fg.error">
                {error}
              </Text>
            ) : null}
            <Button type="submit" loading={isSubmitting} mt={2}>
              Đăng nhập
            </Button>
          </form>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
