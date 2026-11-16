// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CourseReader } from "../src/components/course-reader";
import { coursePackSchema } from "../src/lib/course-schema";
import raw from "../content/course-example.json";
vi.mock("../src/lib/firebase-client",()=>({firebaseAuth:()=>({currentUser:{getIdToken:async()=>"token"}})}));
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
it("restores position and records card self assessment",async()=>{
 const pack=coursePackSchema.parse(raw);
 const view=render(<CourseReader pack={pack} uid="a"/>);
 fireEvent.click(screen.getByText("Virar carta"));
 fireEvent.click(screen.getByText("Preciso revisar — autoavaliação"));
 expect(screen.getByText(/Revisão programada:/)).toBeTruthy();
 fireEvent.click(screen.getByText("Próxima aula"));
 view.unmount();render(<CourseReader pack={pack} uid="a"/>);
 await waitFor(()=>expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("1"));
});
it("sends authenticated analogy request and displays unavailable response",async()=>{
 const fetcher=vi.fn().mockResolvedValue({json:async()=>({message:"Tutor indisponível"})});vi.stubGlobal("fetch",fetcher);
 render(<CourseReader pack={coursePackSchema.parse(raw)} uid="a"/>);
 fireEvent.click(screen.getByText("Pedir analogia"));
 await screen.findByText("Tutor indisponível");
 expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer token");
});
