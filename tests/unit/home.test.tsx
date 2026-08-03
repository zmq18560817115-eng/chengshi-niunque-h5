import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
describe("H5 placeholder",()=>{it("renders the evidence structure",()=>{render(<HomePage />);expect(screen.getByRole("heading",{name:/诚实/})).toBeInTheDocument();expect(screen.getByText("检测项目")).toBeInTheDocument();expect(screen.getByText("复核保障")).toBeInTheDocument();expect(screen.getByText("生产溯源")).toBeInTheDocument();expect(screen.getByText("品牌初心")).toBeInTheDocument();});});
