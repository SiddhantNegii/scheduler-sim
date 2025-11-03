"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil1Icon } from "@radix-ui/react-icons";
import { ProcessForm, ProcessFormValues } from "@/components/cpu/ProcessForm";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import GanttChart from "@/components/GanttChart";
import SummaryTable from "@/components/SummaryTable";
import SummaryStatistics from "@/components/SummaryStatistics";

import { firstComeFirstServe } from "@/lib/FirstComeFirstServe";
import { shortestJobFirst } from "@/lib/ShortestJobFirst";
import { roundRobin } from "@/lib/RoundRobin";
import { shortestRemainingTimeFirst } from "@/lib/ShortestRemainingTimeFirst";
import { nonPreemptivePriority } from "@/lib/PriorityNonPreemptive";
import { preemptivePriority } from "@/lib/PriorityPreemptive";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const FormSchema = z.object({
  algorithm: z.string({
    required_error: "Please select an algorithm to display.",
  }),
  quantum: z.coerce
    .number()
    .lte(100, { message: "Quantum cannot be greater than 100." })
    .optional(),
});

export type Process = {
  process_id: number;
  arrival_time: number; // will be overwritten to actual start time
  burst_time: number;
  background: string;
  priority?: number;
};

export default function MainForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const [processes, setProcesses] = useState<Process[]>([]);
  const [timeline, setTimeline] = useState<Process[]>([]);
  const [metrics, setMetrics] = useState({
    totalWaiting: 0,
    totalTurnaround: 0,
    totalTime: 0,
    busyTime: 0,
    cpuUtil: 0,
  });

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("");
  const summaryRef = useRef<HTMLDivElement>(null);

  const addProcess = (data: ProcessFormValues) => {
    if (editIndex !== null) {
      setProcesses((prev) =>
        prev.map((p, i) => (i === editIndex ? { ...p, ...data } : p))
      );
      setEditIndex(null);
    } else {
      setProcesses((prev) => [
        ...prev,
        { ...data, process_id: prev.length + 1 },
      ]);
    }
    setPopoverOpen(false);
  };

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    if (!processes.length) {
      toast.error("No processes added!", { position: "top-center" });
      return;
    }

    // 1) raw sequence
    let raw: Process[] = [];
    switch (values.algorithm) {
      case "fCFS":
        raw = firstComeFirstServe(processes);
        break;
      case "SJF":
        raw = shortestJobFirst(processes);
        break;
      case "RR":
        raw = roundRobin(processes, values.quantum ?? 0);
        break;
      case "SRTF":
        raw = shortestRemainingTimeFirst(processes);
        break;
      case "NPPS":
        raw = nonPreemptivePriority(processes as Required<Process>[]);
        break;
      case "PPS":
        raw = preemptivePriority(processes as Required<Process>[]);
        break;
    }

    // 2) build real timeline
    const tl: Process[] = [];
    let currentTime = 0;
    const isPreemptive = values.algorithm === "PPS";

    if (isPreemptive) {
      raw.forEach((slice) => {
        // preemptivePriority already stamps arrival_time
        tl.push(slice);
        currentTime = slice.arrival_time + slice.burst_time;
      });
    } else {
      raw.forEach((proc) => {
        const start = Math.max(currentTime, proc.arrival_time);
        tl.push({ ...proc, arrival_time: start });
        currentTime = start + proc.burst_time;
      });
    }

    // 3) set timeline & scroll
    setTimeline(tl);
    setTimeout(
      () => summaryRef.current?.scrollIntoView({ behavior: "smooth" }),
      0
    );
  };

  const showPriority =
    selectedAlgorithm === "NPPS" || selectedAlgorithm === "PPS";

  return (
    <div className="space-y-8">
      <ToastContainer />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Algorithm Picker */}
        <div className="p-6 border rounded-2xl shadow">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="algorithm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Algorithm</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        setSelectedAlgorithm(v);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fCFS">FCFS</SelectItem>
                        <SelectItem value="RR">Round Robin</SelectItem>
                        <SelectItem value="SJF">SJF</SelectItem>
                        <SelectItem value="SRTF">SRTF</SelectItem>
                        <SelectItem value="NPPS">
                          Priority (Non-Preemptive)
                        </SelectItem>
                        <SelectItem value="PPS">
                          Priority (Preemptive)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedAlgorithm === "RR" && (
                <FormField
                  control={form.control}
                  name="quantum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Quantum</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" className="w-full">
                Run Simulation
              </Button>
            </form>
          </Form>
        </div>

        {/* Process List */}
        <Card className="p-6 rounded-2xl shadow">
          <CardHeader>
            <CardTitle>Processes</CardTitle>
            <CardDescription>Add or edit processes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {processes.map((p, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="h-8 w-8 rounded-full"
                    style={{ background: p.background }}
                  />
                  <div>
                    <div>PID {p.process_id}</div>
                    <div className="text-xs text-gray-600">
                      AT: {p.arrival_time}, BT: {p.burst_time}
                      {p.priority != null && `, P: ${p.priority}`}
                    </div>
                  </div>
                </div>
                <Pencil1Icon
                  className="cursor-pointer"
                  onClick={() => {
                    setEditIndex(idx);
                    setPopoverOpen(true);
                  }}
                />
              </div>
            ))}

            <div className="flex gap-4 pt-4">
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline">Add Process</Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <ProcessForm
                    addProcess={addProcess}
                    initialValues={
                      editIndex != null ? processes[editIndex] : undefined
                    }
                    showPriority={showPriority}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" onClick={() => setProcesses([])}>
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {timeline.length > 0 && (
        <div ref={summaryRef} className="space-y-8">
          <GanttChart processes={timeline} />

          <div className="flex flex-col md:flex-row gap-8">
            <SummaryTable
              originalProcesses={processes}
              scheduledProcesses={timeline}
              algorithm={selectedAlgorithm}
              onMetrics={setMetrics}
            />
            <SummaryStatistics totalProcesses={processes.length} {...metrics} />
          </div>
        </div>
      )}
    </div>
  );
}
