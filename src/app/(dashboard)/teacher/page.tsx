import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import { auth } from "@clerk/nextjs/server";

const TeacherPage = () => {
  const { userId } = auth();
  return (
    <div className="flex-1 min-h-0 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3 xl:flex xl:flex-col xl:min-h-0">
        <div className="bg-white p-4 rounded-md flex flex-col overflow-hidden h-[600px] xl:h-auto xl:flex-1 xl:min-h-0">
          <h1 className="text-xl font-semibold">Schedule</h1>
          <div className="flex-1 min-h-0 mt-2">
            <BigCalendarContainer type="teacherId" id={userId!} />
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
      </div>
    </div>
  );
};

export default TeacherPage;
