import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { Plus } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useFormatDate from "@/hooks/useFormatDate";

interface UnitType {
  UnitId: number;
  UnitName: string;
  Description: string;
  date: string;
}

const UnitDetail = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const [Unit, setUnit] = useState<UnitType>({
    UnitId: 0,
    UnitName: "",
    Description: "",
    date: "",
  });

  const formatDate = useFormatDate();

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchUnit = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${variables.API_URL}Unit/detail/${id}`, {
            headers: {
              "Authorization": `Bearer ${token}`
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUnit({
              UnitId: data.unitId,
              UnitName: data.unitName || "",
              Description: data.description || "",
              date: formatDate(data.createdOn),
            });
          } else {
            toast.error("An error occurred while fetching the Unit details. Please try again.");
            setTimeout(() => { navigate(-1); }, 2000);
          }
        } catch (error) {
          toast.error("Error fetching Unit details. Please try again later.");
          setTimeout(() => { navigate(-1); }, 2000);
        } finally {
          setLoading(false);
        }
      };
      fetchUnit();
    } else {
      setLoading(false);
    }
  }, [id, navigate, token]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Units</h1>
        <p className="text-gray-600 mt-1">View Unit Detail</p>
      </div>

      <Card className="p-6">
  <div className="flex justify-between items-center">
    <div className="flex items-center space-x-2">
      <Label className="text-sm font-medium text-gray-700">ID:</Label>
      <Label className="text-sm text-gray-900">{Unit.UnitId}</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Label className="text-sm font-medium text-gray-700">Created Date:</Label>
      <Label className="text-sm text-gray-900">{Unit.date}</Label>
    </div>
  </div>

  <div className="space-y-4 mt-4">
    <div>
      <Label className="block text-sm font-medium text-gray-700">Unit Name</Label>
      <div className="mt-1 text-lg font-semibold text-gray-900">
        {Unit.UnitName}
      </div>
    </div>
    <div>
      <Label className="block text-sm font-medium text-gray-700">Description</Label>
      <div className="mt-1 text-lg text-gray-900">
        {Unit.Description}
      </div>
    </div><div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Back
                </Button>
                
              </div>
  </div>
</Card>

      <ToastContainer />
    </div>
  );
};

export default UnitDetail;
