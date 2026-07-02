import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("asChild 링크에도 버튼 색과 밑줄 제거 class를 적용한다", () => {
    render(
      <Button asChild variant="outline" size="sm">
        <a href="/admin/places/1/edit">수정</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: "수정" });
    expect(link).toHaveAttribute("href", "/admin/places/1/edit");
    expect(link).toHaveClass("text-foreground");
    expect(link).toHaveClass("no-underline");
    expect(link).toHaveClass("border-input");
  });
});
