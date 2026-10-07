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

interface sellerDetail {

    sellerId: number;
    sellerName: string;
    cityName: string;
    contactNo: string;
    email: string;
    address: string;
    date: string;

}

const SellerInfoDetail = () => {
    const { token } = useSelector((state: RootState) => state.userAuthStore);
    const { id } = useParams<{ id: string }>();
    const [Seller, setSeller] = useState<sellerDetail>({
        sellerId: 0,
        sellerName: "",
        cityName: "",
        contactNo: "",
        email: "",
        address: "",
        date: "",
    });

    

    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const formatDate = useFormatDate();

    useEffect(() => {
        if (id) {
            const fetchSeller = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`${variables.API_URL}Seller/detail/${id}`, {
                        headers: {
                            "Authorization": `Bearer ${token}`
                        },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setSeller({
                            sellerId: data.sellerId,
                            sellerName: data.sellerName,
                            cityName: data.cityName,
                            contactNo: data.contactNo,
                            email: data.email,
                            address: data.address,


                            date: formatDate(data.createdOn),
                        });
                    } else {
                        toast.error("An error occurred while fetching the Seller details. Please try again.");
                        setTimeout(() => { navigate(-1); }, 2000);
                    }
                } catch (error) {
                    toast.error("Error fetching Seller details. Please try again later.");
                    setTimeout(() => { navigate(-1); }, 2000);
                } finally {
                    setLoading(false);
                }
            };
            fetchSeller();
        } else {
            setLoading(false);
        }
    }, [id, navigate, token]);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Sellers</h1>
                <p className="text-gray-600 mt-1">View Seller Detail</p>
            </div>

            <Card className="p-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <Label className="text-sm font-medium text-gray-700">ID:</Label>
                        <Label className="text-sm text-gray-900">{Seller.sellerId}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label className="text-sm font-medium text-gray-700">Created Date:</Label>
                        <Label className="text-sm text-gray-900">{Seller.date}</Label>
                    </div>
                </div>

                <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
                <div className="flex items-center space-x-2">
            <Label className="block text-sm font-medium text-gray-700">Seller Name:</Label>
            <p className="mt-1 text-gray-900">{Seller.sellerName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Label className="block text-sm font-medium text-gray-700">City:</Label>
            <p className="mt-1 text-gray-900">{Seller.cityName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Label className="block text-sm font-medium text-gray-700">Email:</Label>
            <p className="mt-1 text-gray-900">{Seller.email}</p>
          </div>
          <div className="flex items-center space-x-2">
          <Label className="block text-sm font-medium text-gray-700">Contact:</Label>
            <p className="mt-1 text-gray-900">{Seller.contactNo}</p>
          </div>
          {/* If you want address to span all 3 columns, use md:col-span-3 */}
          <div className="flex items-center space-x-2">
  <Label className="block text-sm font-medium text-gray-700">Address:</Label>
  <p className="text-gray-900">{Seller.address}</p>
</div>
        </div>

                    <div className="flex justify-end gap-2">
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

export default SellerInfoDetail;
