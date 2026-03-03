import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Track Fence Jobs Without Losing Money or Your Mind | FenceEstimatePro",
  description: "Fence job tracking software solves the most common problems in fence contracting: missed details, labor overruns, and jobs that close without anyone knowing if they made money.",
  openGraph: {
    title: "How to Track Fence Jobs Without Losing Money or Your Mind",
    description: "Fence job tracking software solves the most common problems in fence contracting: missed details, labor overruns, and jobs that close without anyone knowing if they made money.",
  },
};

export default function ArticlePage() {
  return (
    <main>
      {/* Dark article header */}
      <section className="bg-gradient-to-br from-fence-950 via-fence-900 to-fence-800 text-white px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-2 text-fence-300 hover:text-white text-sm mb-8 transition-colors">
            Back to Blog
          </Link>
          <span className="inline-block bg-teal-500/20 text-teal-300 text-xs font-bold px-3 py-1 rounded-full mb-4">Operations</span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
            How to Track Fence Jobs Without Losing Money or Your Mind
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-fence-300">
            <span>March 1, 2026</span>
            <span>·</span>
            <span>7 min read</span>
            <span>·</span>
            <span>By Pearl Ventures</span>
          </div>
        </div>
      </section>

      {/* Article Body */}
      <article className="bg-white px-6 py-16">
        <div className="max-w-[680px] mx-auto prose-custom" style={{ lineHeight: "1.8", fontFamily: "Inter, sans-serif" }}>

          <p className="text-gray-700 text-lg">
            Fence job tracking is the part of the business that most contractors figure out last — after they have already lost money on jobs they could not explain, missed follow-ups on quotes that should have closed, and spent too much time answering the same questions from crew, customers, and themselves. The right fence job tracking software eliminates most of those problems before they start.
          </p>

          <p className="text-gray-700">
            This is not about complexity. Most fence contractors do not need a 40-feature platform that takes weeks to configure. They need clear, accessible information on every active job — where it is in the process, what was quoted, what has been spent, and what still needs to happen before it closes.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">What Job Tracking Actually Means in Fence Contracting</h2>
          <p className="text-gray-700">
            Job tracking is the ability to answer, at any moment, where every active job stands. That sounds basic. In practice, most fence contractors are running that information across a combination of their memory, a physical notebook, a whiteboard, text messages, and maybe a folder of PDFs on their phone. None of those systems talk to each other, and when something falls through the cracks, it is expensive.
          </p>
          <p className="text-gray-700">
            Fence job tracking software consolidates job information into one place. You can see which jobs are in estimate, which are approved, which are scheduled, which are in progress, and which are done but not yet invoiced. That last category — done but not invoiced — is where a surprising amount of revenue disappears in fence operations that lack a tracking system.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">The Four Stages That Need Tracking</h2>
          <p className="text-gray-700">Every fence job moves through roughly the same stages. A good tracking system makes the status of each stage visible:</p>

          <div className="space-y-4 my-6">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <p className="font-bold text-gray-900 mb-1">Stage 1: Lead and Estimate</p>
              <p className="text-gray-700 text-sm m-0">When did the lead come in? When was the estimate sent? Has the customer responded? Is there a follow-up scheduled? Quotes that go out without follow-up tracking are revenue that dissolves quietly.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <p className="font-bold text-gray-900 mb-1">Stage 2: Approved and Scheduled</p>
              <p className="text-gray-700 text-sm m-0">Was the deposit collected? Is the job on the crew calendar? Are materials ordered? A job that is approved but not fully set up for production is a job that will have a problem at the start date.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <p className="font-bold text-gray-900 mb-1">Stage 3: In Progress</p>
              <p className="text-gray-700 text-sm m-0">Is the crew on-site? Have any scope changes come up? Are actual hours tracking against the estimate? Labor overruns that go unnoticed during installation cannot be recovered after the job is complete.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <p className="font-bold text-gray-900 mb-1">Stage 4: Complete and Closed</p>
              <p className="text-gray-700 text-sm m-0">Has the final invoice been sent? Has payment been collected? Has a post-job review been done? Jobs do not close themselves, and an invoice that sits unsent is the same as a job you did for free.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Why Spreadsheets Break Down as a Tracking Tool</h2>
          <p className="text-gray-700">
            Spreadsheets are a reasonable starting point for fence job tracking. They are free, flexible, and familiar. The problem is that they are static: someone has to update them, they do not connect to your estimates, and they provide no workflow — just a list of rows that can get out of date the moment the person who manages the sheet gets busy.
          </p>
          <p className="text-gray-700">
            When a fence operation is running five or more active jobs at a time, spreadsheet tracking becomes a maintenance burden instead of a management tool. The cells you need to check are always one tab away, the data is always slightly stale, and the information about what is wrong with a specific job is always in a text message somewhere.
          </p>
          <p className="text-gray-700">
            Dedicated fence job tracking software solves the update problem by connecting tracking to the places where work actually happens — the estimate, the schedule, the invoice. When those things update, the job status updates with them.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">What to Look for in Fence Job Tracking Software</h2>
          <p className="text-gray-700">Not all job tracking tools are built for the way fence contracting works. When evaluating options, focus on these:</p>

          <ul className="text-gray-700 space-y-3 pl-6 list-disc">
            <li>
              <strong>Job pipeline view.</strong> You need to see all active jobs and their current status at a glance. If getting that view requires running a report or opening individual records, the tool is adding friction instead of removing it.
            </li>
            <li>
              <strong>Connection to estimates.</strong> Tracking a job from estimate to invoice in the same system means the scope, pricing, and customer information does not have to be re-entered at each stage. Disconnected tools create data entry work and introduce errors.
            </li>
            <li>
              <strong>Labor and cost tracking against estimate.</strong> The ability to record actual costs during the job and compare them to what was estimated is what separates job tracking from job logging. You want to know mid-job if you are running over, not after you have already closed it out.
            </li>
            <li>
              <strong>Customer communication log.</strong> Every call, text, and email related to a job should be traceable. When a customer disputes what was agreed to, the record needs to exist somewhere other than your memory.
            </li>
            <li>
              <strong>Mobile access.</strong> Your crew lead is not at a desk. If your tracking software requires a laptop to use, it will not get used in the field.
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">The Real Cost of Not Tracking Jobs</h2>
          <p className="text-gray-700">
            The cost of poor job tracking shows up in a few predictable ways: jobs that close below expected margin because no one caught the labor overrun, quotes that expire without follow-up because there was no system to prompt it, and invoices sent late because the job fell off the radar after installation was done.
          </p>
          <p className="text-gray-700">
            Each of those problems is individually recoverable. All of them together, across every job in a busy season, represent a significant amount of money and a lot of unnecessary stress.
          </p>
          <p className="text-gray-700">
            Fence job tracking software does not eliminate the complexity of running a fence business. It makes that complexity manageable — one job at a time, one stage at a time, with the information you need visible when you need it.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Start Simple and Build From There</h2>
          <p className="text-gray-700">
            The biggest mistake contractors make when adopting job tracking tools is trying to use every feature immediately. Start with the pipeline view and make sure every active job has a current status. That single habit — keeping job statuses current — eliminates most of the dropped-ball problems that tracking is designed to solve.
          </p>
          <p className="text-gray-700">
            Once pipeline visibility is routine, add actual cost tracking against estimates. Once that is routine, use the data to improve your estimating. Each layer compounds into a more accurate, more profitable operation. It takes time, but it builds something that does not depend on any one person holding all the information in their head.
          </p>
        </div>
      </article>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-fence-950 to-fence-800 text-white px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Know where every job stands. Always.</h2>
          <p className="text-fence-200 text-lg mb-8">
            FenceEstimatePro connects your estimates, job status, and costs in one place so nothing falls through the cracks and you always know your margin before a job closes.
          </p>
          <Link
            href="https://fenceestimatepro.com/signup"
            className="inline-flex items-center gap-2 bg-fence-500 hover:bg-fence-400 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors shadow-lg"
          >
            Try FenceEstimatePro Free
          </Link>
        </div>
      </section>
    </main>
  );
}
